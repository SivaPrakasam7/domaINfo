const { By, Key, until } = require('selenium-webdriver'),
    chrome = require('selenium-webdriver/chrome'),
    { performance } = require('perf_hooks');

module.exports = {
    query: null, url: null, edata: null, data: { Screenshot: [] }, options: new chrome.Options(), dirver: 0,
    async scrap(query, edata) {
        if (edata && query) {
            this.query = query;
            this.edata = edata;
            try {
                // Main loop
                this.data.performance = performance.now();
                for (const [k, v] of Object.entries(this.edata)) {
                    if (k == "Options") {
                        // Set Browser options
                        for (var arg of v) this.options.addArguments(`--${arg}`);
                        this.driver = chrome.Driver.createSession(new chrome.Options(this.options), new chrome.ServiceBuilder().build());
                        this.driver.manage().window().maximize();
                    } else if (k == "Main") {
                        // Request URL
                        this.url = eval(v);
                        this.data.Query = this.query;
                        this.data.Link = this.url;
                        await this.driver.get(this.url);
                        this.data.Screenshot.push({ [this.url]: `data:image/png;base64,${await this.driver.takeScreenshot()}` });
                    } else if (k == "Login") {
                        // Login site
                        for (var ck of v) await this.driver.executeScript(ck);
                        await this.driver.get(this.url);
                        this.data.Screenshot.push({ [this.url]: `data:image/png;base64,${await this.driver.takeScreenshot()}` });
                    } else {
                        this.data[k] = []
                        if (v.Url) {
                            await this.driver.get(this.url + v.Url);
                            this.data.Screenshot.push({ [this.url]: `data:image/png;base64,${await this.driver.takeScreenshot()}` });
                        }
                        v.Script ? await this.driver.executeScript(v.Script) : null;
                        // Heavy loop 1
                        for (var elem of await this.driver.wait(until.elementsLocated(By.xpath(v.xpath)), 5000).catch(() => { return [null] })) {
                            if (typeof v.func === "string" && elem) {
                                var tmpd = await eval(v.func).catch(err => { return null });
                                tmpd ? v.pattern ? this.data[k].push([...tmpd.matchAll(v.pattern)].toString().split(',')) : this.data[k].push(tmpd) : null;
                            }
                            else if (elem) {
                                var tmp = {};
                                // Heavy loop 2
                                for (const [k1, v1] of Object.entries(v.func)) {
                                    var rslt = await eval(v1).catch(() => { return null });
                                    rslt ? tmp[k1] = rslt : null;
                                }
                                Object.keys(tmp).length ? this.data[k].push(tmp) : null;
                            }
                        }
                        // Heavy loop 3 removal of empty and duplicates
                        var rslt = [...new Set(this.data[k].flat())];
                        rslt.length === 1 ? this.data[k] = rslt[0] : this.data[k] = rslt;
                    }
                }
            } catch (err) {
                return err;
            } finally {
                this.data.performance = `${performance.now() - this.data.performance}ms`;
                this.driver.quit();
            }
        } else return "You need to set username and edata"
        return this.data;
    }
}