const whois = require('whois-json'),
    dns = require('dns'),
    fetch = require('node-fetch'),
    fs = require('fs'),
    { performance } = require('perf_hooks'),
    gdork = require('../entities/google'),
    Browser = require('./XSEngine');

module.exports = {
    data: null,
    gdata: [],
    asn: {
        Options: ['disable-notifications', 'disable-default-apps', 'disable-popup-blocking', 'headless'],
        Main: "`https://bgp.he.net/dns/${this.query}#_ipinfo`",
        Results: {
            Script: "return window.scrollTo(0, document.body.scrollHeight)",
            xpath: "//a[contains(@href,'AS')]",
            func: "elem.getText()"
        }
    },
    performance: performance.now(),
    // Check and Set IP range
    ipcheck(ip) {
        ck = ip.split('.')[0];
        if (0 <= ck && ck <= 127) return `${ip.split('.').slice(0, -1).join('.')}.1/8`;
        if (128 <= ck && ck <= 191) return `${ip.split('.').slice(0, -1).join('.')}.1/16`;
        if (192 <= ck && ck <= 223) return `${ip.split('.').slice(0, -1).join('.')}.1/24`;
    },
    // Main function get domain informations
    async get(domain, sublist) {
        // Get whois information
        await whois(domain).then(rslt => { this.data = rslt });
        this.data.domainName = domain;
        this.data.mailExchange = [];
        this.data.nameServer = [];
        this.data.textRecord = [];
        this.data.subDomains = [];
        // Get DNS records
        (await dns.promises.resolveAny(domain)).map(a => {
            a.type === "A" ? (() => {
                this.data.ip = a.address;
                this.data.ipRanges = this.ipcheck(a.address);
            })() : null;
            a.type === "AAAA" ? this.data.ipv6 = a.address : null;
            a.type === "MX" ? this.data.mailExchange.push({ [a.priority]: a.exchange }) : null;
            a.type === "NS" ? this.data.nameServer.push(a.value) : null;
            a.type === "TXT" ? this.data.textRecord.push(a.value) : null;
            a.type === "SOA" ? (() => {
                delete a.type;
                this.data.startOfAuthority = a;
            })() : null;
        });
        // Enumerate subdomains
        sublist && await this.subdomain(domain, sublist);
        // Google Droking
        this.data.googleDrok = await this.gdork(domain);
        this.data.asn = (await Browser.scrap(domain, this.asn)).Results;
        this.data.asnIPv4Graph = `https://bgp.he.net/graphs/${this.data.asn.toLowerCase()}-ipv4.svg`;
        this.data.asnIPv6Graph = `https://bgp.he.net/graphs/${this.data.asn.toLowerCase()}-ipv6.svg`;
        this.data.performance = `${performance.now() - this.performance}ms`;
        return this.data;
    },
    // Subdomain enumeration
    async subdomain(domain, sublist) {
        for (var w of [...new Set(fs.readFileSync(sublist, 'utf-8').split('\n'))]) {
            (await fetch(`https://${w}.${domain}`).then(rslt => { return rslt.status }).catch(err => { return 400 }) === 200) ? this.data.subDomains.push(`https://${w}.${domain}`) : null;
        }
    },
    // Google dorking about domain
    async gdork(domain) {
        for (var q of [`index of ${domain}`, `site:${domain}`, `intext:${domain}`, `intitle:${domain}`, `define:${domain}`, `info:${domain}`, `domain:*.${domain} site:*.${domain}`, `related:${domain}`, `link:${domain}`, `@${domain}`, `phonebook:${domain}`, `${domain}`]) {
            await Browser.scrap(q, gdork).then(rslt => { this.gdata.push(rslt.Results) });
        }
        // console.log(JSON.stringify([...new Set(this.gdata.flat().map(i => i.Link))], null, 4));
        this.data.subDomains=this.data.subDomains.concat([...new Set(this.gdata.flat().map(i=>/https?:\/\/\w+.?\w+.google.com/i.exec(i.Link)).filter(Boolean).flat())]); // eval(`/\w+.?\w+.${domain}/g`).exec(i.Link)
        return [...new Map(this.gdata.flat().map(i => [i.Link, i])).values()];
    }
}