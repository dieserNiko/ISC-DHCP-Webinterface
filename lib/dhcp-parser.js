const fs = require('fs');

class DHCPParser {
    constructor(filePath) {
        this.filePath = filePath;
        this.blocks = [];
    }

    parse() {
        if (!fs.existsSync(this.filePath)) return { subnets: [], hosts: [], globals: [] };
        const content = fs.readFileSync(this.filePath, 'utf-8');
        const lines = content.split('\n');
        
        this.blocks = [];
        let currentBlock = null;
        let braceLevel = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();

            if (!currentBlock && (trimmed.startsWith('subnet') || trimmed.startsWith('host') || trimmed.startsWith('class') || trimmed.startsWith('subclass') || trimmed.startsWith('shared-network'))) {
                currentBlock = {
                    type: trimmed.split(' ')[0],
                    identifier: this.extractIdentifier(trimmed),
                    lines: [line],
                    data: {} 
                };
                if (trimmed.includes('{')) braceLevel++;
                continue;
            }

            if (currentBlock) {
                currentBlock.lines.push(line);
                if (trimmed.includes('{')) braceLevel++;
                if (trimmed.includes('}')) braceLevel--;

                if (braceLevel === 0) {
                    this.processBlockData(currentBlock);
                    this.blocks.push(currentBlock);
                    currentBlock = null;
                }
            } else {
                // Check if it's a global option
                if (trimmed.startsWith('option ') || trimmed.startsWith('default-lease-time') || trimmed.startsWith('max-lease-time')) {
                    this.blocks.push({
                        type: 'global',
                        lines: [line]
                    });
                } else {
                    this.blocks.push({
                        type: 'raw',
                        lines: [line]
                    });
                }
            }
        }

        const hosts = this.blocks.filter(b => b.type === 'host').map(b => ({ ...b.data, id: b.identifier, type: 'host' }));
        const subclasses = this.blocks.filter(b => b.type === 'subclass').map(b => ({ ...b.data, id: b.identifier, type: 'subclass' }));

        return {
            subnets: this.blocks.filter(b => b.type === 'subnet').map(b => ({ ...b.data, id: b.identifier })),
            hosts: [...hosts, ...subclasses],
            globals: this.blocks.filter(b => b.type === 'global').map(b => b.lines[0].trim().replace(';', ''))
        };
    }

    extractIdentifier(line) {
        const parts = line.split(/\s+/);
        if (parts[0] === 'subnet') return parts[1];
        if (parts[0] === 'host') return parts[1];
        if (parts[0] === 'subclass') return (parts[2] ? parts[2].replace(/"/g, '') : parts[1]);
        return parts.slice(0, 3).join(' '); 
    }

    processBlockData(block) {
        if (block.type === 'host' || block.type === 'subclass') {
            block.data.name = block.identifier;
            block.lines.forEach(l => {
                const t = l.trim();
                // Subclass value might be the hardware address
                if (block.type === 'subclass') {
                    const headerParts = block.lines[0].trim().split(/\s+/);
                    if (headerParts.length >= 3 && headerParts[2].includes(':')) {
                        block.data.hardware = headerParts[2].replace(/"/g, '');
                    }
                }

                if (t.startsWith('hardware ethernet')) block.data.hardware = t.split(' ')[2].replace(';', '');
                if (t.startsWith('fixed-address')) block.data.address = t.split(' ')[1].replace(';', '');
                if (l.includes('option host-name')) {
                    const match = l.match(/option host-name\s+"?([^";]+)"?/);
                    if (match) block.data.hostname = match[1];
                }
            });
        } else if (block.type === 'subnet') {
            const parts = block.lines[0].trim().split(/\s+/);
            block.data.network = parts[1];
            block.data.netmask = parts[3];
            block.data.pools = [];
            block.data.options = [];
            
            let currentPool = null;
            let poolBraceLevel = 0;

            block.lines.forEach(l => {
                const t = l.trim();
                
                // Track nested pools
                if (t.startsWith('pool {')) {
                    currentPool = { options: [] };
                    poolBraceLevel = 1;
                }

                // Range can be global in subnet or inside a pool
                if (t.includes('range ')) {
                    const match = t.match(/range\s+([0-9.]+)\s+([0-9.]+)/);
                    if (match) {
                        const range = { start: match[1], end: match[2] };
                        if (currentPool) {
                            currentPool.start = range.start;
                            currentPool.end = range.end;
                        } else {
                            block.data.pools.push({ ...range, options: [] });
                        }
                    }
                }

                if (t.startsWith('option ')) {
                    if (currentPool) {
                        currentPool.options.push(t.replace(';', '').trim());
                    } else {
                        block.data.options.push(t.replace(';', '').trim());
                    }
                }

                if (currentPool && (t === '}' || t.endsWith('}'))) {
                    poolBraceLevel--;
                    if (poolBraceLevel === 0) {
                        if (currentPool.start) block.data.pools.push(currentPool);
                        currentPool = null;
                    }
                }
            });

            // Fallback for simple ranges not in pool blocks if any were missed
            if (block.data.pools.length === 0) {
                block.lines.forEach(l => {
                    const t = l.trim();
                    if (t.startsWith('range ')) {
                        const rangeParts = t.replace('range', '').replace(';', '').trim().split(/\s+/);
                        block.data.pools.push({ start: rangeParts[0], end: rangeParts[1], options: [] });
                    }
                });
            }
        }
    }

    updateHost(hostData) {
        // Find existing host OR subclass to replace
        const index = this.blocks.findIndex(b => (b.type === 'host' || b.type === 'subclass') && b.identifier === hostData.id);
        const name = hostData.name || hostData.id;
        const newLines = [
            `host ${name} {`,
            `  hardware ethernet ${hostData.hardware};`,
            `  fixed-address ${hostData.address};`,
            hostData.hostname ? `  option host-name "${hostData.hostname}";` : '',
            `}`
        ].filter(l => l !== '');

        const newBlock = { type: 'host', identifier: name, lines: newLines };
        if (index > -1) this.blocks[index] = newBlock;
        else this.blocks.push(newBlock);
    }

    updateSubnet(subnetData) {
        const index = this.blocks.findIndex(b => b.type === 'subnet' && b.identifier === subnetData.id);
        const newLines = [
            `subnet ${subnetData.network} netmask ${subnetData.netmask} {`,
            ...(subnetData.pools || []).map(p => {
                const po = (p.options || []).map(o => `    ${o};`).join('\n');
                return `  pool {\n    range ${p.start} ${p.end};\n${po}\n  }`;
            }),
            ...(subnetData.options || []).map(o => `  ${o};`),
            `}`
        ];

        const newBlock = { type: 'subnet', identifier: subnetData.network, lines: newLines };
        if (index > -1) this.blocks[index] = newBlock;
        else this.blocks.push(newBlock);
    }

    updateGlobals(globals) {
        // Remove existing globals
        this.blocks = this.blocks.filter(b => b.type !== 'global');
        // Add new ones
        globals.forEach(g => {
            if (g.trim()) {
                this.blocks.push({ type: 'global', lines: [`${g};`] });
            }
        });
    }

    deleteBlock(type, identifier) {
        this.blocks = this.blocks.filter(b => {
            if (type === 'host') {
                return !((b.type === 'host' || b.type === 'subclass') && b.identifier === identifier);
            }
            return !(b.type === type && b.identifier === identifier);
        });
    }

    deleteLease(ip) {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        const lines = content.split('\n');
        const newLines = [];
        let inTargetLease = false;
        let braceLevel = 0;

        for (let line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith(`lease ${ip} {`)) {
                inTargetLease = true;
                braceLevel++;
                continue;
            }

            if (inTargetLease) {
                if (trimmed.includes('{')) braceLevel++;
                if (trimmed.includes('}')) braceLevel--;
                if (braceLevel === 0) inTargetLease = false;
                continue;
            }

            newLines.push(line);
        }
        fs.writeFileSync(this.filePath, newLines.join('\n'), 'utf-8');
    }

    generate() {
        return this.blocks.map(b => b.lines.join('\n')).join('\n');
    }

    save() {
        fs.writeFileSync(this.filePath, this.generate(), 'utf-8');
    }
}

module.exports = DHCPParser;
