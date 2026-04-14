const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const dhcpdleases = require('dhcpd-leases');
const DHCPParser = require('./lib/dhcp-parser');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || 'super-secret-dhcp-key';

// PAM Setup
let pam;
try {
    pam = require('node-linux-pam');
} catch (e) {
    console.warn('PAM module not found. Using mock (admin:admin).');
    pam = {
        pamAuthenticatePromise: ({ username, password }) => {
            return new Promise((resolve, reject) => {
                if (username === 'admin' && password === 'admin') resolve();
                else reject(new Error('Invalid credentials (MOCK)'));
            });
        }
    };
}

// Config Paths
const CONF_PATH = process.env.DHCP_CONF_PATH || '/etc/dhcp/dhcpd.conf';
const LEASE_PATH = process.env.DHCP_LEASE_PATH || '/var/lib/dhcp/dhcpd.leases';

app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// Serve Static Files
const staticPath = path.join(__dirname, 'dist');
app.use(express.static(staticPath));

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Access denied' });
    try {
        const verified = jwt.verify(token, SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid token' });
    }
};

// --- API Endpoints ---

const restartDHCP = (res, message = 'Saved') => {
    exec('sudo systemctl restart isc-dhcp-server', (err, stdout, stderr) => {
        if (err) {
            console.error('Restart failed:', stderr);
            return res.json({ message, warning: 'Configuration saved but service restart failed.' });
        }
        res.json({ message: message + ' and service restarted' });
    });
};

app.get('/api/me', authenticateToken, (req, res) => {
    res.json({ username: req.user.username });
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        await pam.pamAuthenticatePromise({ username, password });
        const token = jwt.sign({ username }, SECRET, { expiresIn: '24h' }); // Longer session
        res.cookie('token', token, { httpOnly: true, secure: false });
        res.json({ message: 'Login successful', username });
    } catch (err) {
        res.status(401).json({ error: 'Authentication failed' });
    }
});

app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out' });
});

app.get('/api/leases', authenticateToken, (req, res) => {
    try {
        if (!fs.existsSync(LEASE_PATH)) return res.json([]);
        const rawData = dhcpdleases(fs.readFileSync(LEASE_PATH, 'utf-8'));
        const leases = Object.values(rawData).map(l => ({
            ...l,
            ip: l.ip || l['ip-address']
        }));
        res.json(leases);
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.delete('/api/leases/:ip', authenticateToken, (req, res) => {
    try {
        const ip = req.params.ip;
        // Lease deletion requires service restart
        exec('sudo systemctl stop isc-dhcp-server', (err) => {
            const parser = new DHCPParser(LEASE_PATH);
            parser.deleteLease(ip);
            exec('sudo systemctl start isc-dhcp-server', () => {
                res.json({ message: 'Lease deleted and server restarted' });
            });
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.get('/api/config', authenticateToken, (req, res) => {
    try {
        const parser = new DHCPParser(CONF_PATH);
        res.json(parser.parse());
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.post('/api/hosts', authenticateToken, (req, res) => {
    try {
        const parser = new DHCPParser(CONF_PATH);
        parser.parse();
        parser.updateHost(req.body);
        parser.save();
        restartDHCP(res, 'Host saved');
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.delete('/api/hosts/:id', authenticateToken, (req, res) => {
    try {
        const parser = new DHCPParser(CONF_PATH);
        parser.parse();
        parser.deleteBlock('host', req.params.id);
        parser.save();
        restartDHCP(res, 'Host deleted');
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.post('/api/subnets', authenticateToken, (req, res) => {
    try {
        const parser = new DHCPParser(CONF_PATH);
        parser.parse();
        parser.updateSubnet(req.body);
        parser.save();
        restartDHCP(res, 'Subnet saved');
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.delete('/api/subnets/:id', authenticateToken, (req, res) => {
    try {
        const parser = new DHCPParser(CONF_PATH);
        parser.parse();
        parser.deleteBlock('subnet', req.params.id);
        parser.save();
        restartDHCP(res, 'Subnet deleted');
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.post('/api/globals', authenticateToken, (req, res) => {
    try {
        const parser = new DHCPParser(CONF_PATH);
        parser.parse();
        parser.updateGlobals(req.body.globals);
        parser.save();
        restartDHCP(res, 'Globals saved');
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.post('/api/restart', authenticateToken, (req, res) => {
    exec('sudo systemctl restart isc-dhcp-server', (err, stdout, stderr) => {
        if (err) return res.status(500).json({ error: stderr });
        res.json({ message: 'Restarted' });
    });
});

app.get('/*', (req, res) => {
    const indexPath = path.join(staticPath, 'index.html');
    if (fs.existsSync(indexPath)) res.sendFile(indexPath);
    else res.status(404).send('Not Built');
});

app.listen(PORT, () => console.log(`Running on ${PORT}`));
