const express = require("express")
const { chromium } = require("playwright-chromium")
const { firefox } = require("playwright-firefox")

const app = express()
app.use(express.static("./public"))
const port = process.env.PORT || 3000;

app.get("/browser/:name", async (req, res) => {
  const browserName = req.params["name"] || "chromium"
  if (!["chromium", "firefox"].includes(browserName)) {
    return res.status(500).send(`invalid browser name (${browserName})!`)
  }
  const url = req.query.url || "https://microsoft.com"
  const waitUntil = req.query.waitUntil || "load"
  const width = req.query.width ? parseInt(req.query.width, 10) : 1920
  const height = req.query.height ? parseInt(req.query.height, 10) : 1080
  console.log(`Incoming request for browser '${browserName}' and URL '${url}'`)
  try {
    /** @type {import('playwright-chromium').Browser} */
    const browser = await { chromium, firefox }[browserName].launch({
      chromiumSandbox: false
    })
    const page = await browser.newPage({
      viewport: {
        width,
        height
      }
    })
    await page.goto(url, {
      timeout: 10 * 1000,
      waitUntil
    })
    if (req.query.timeout) {
      await page.waitForTimeout(parseInt(req.query.timeout, 10))
    }
    const data = await page.screenshot({
      type: "png"
    })
    await browser.close()
    res.contentType("image/png")
    res.set("Content-Disposition", "inline;");
    res.send(data)
  } catch (err) {
    res.status(500).send(`Something went wrong: ${err}`)
  }
});

app.get("/flashscore/matches", async (req, res) => {
  try {
    /** @type {import('playwright-chromium').Browser} */
    const browser = await chromium.launch({
      chromiumSandbox: false
    })
    const page = await browser.newPage()
    await page.goto("https://www.flashscore.com", {
      timeout: 60 * 1000,
      waitUntil: "load"
    })
    
    let starredLeagues = await page.$$eval('#live-table > section > div > div > div.event__header.top', el => el.innerText);

    let matches = await page
      .$$eval('#live-table > section > div > div > div.event__match', (els) => {
        return els.map(el => {
          
          function getPreviousSibling(elem, selector) {

            // Get the next sibling element
            var sibling = elem.previousElementSibling;

            // If there's no selector, return the first sibling
            if (!selector) return sibling;

            // If the sibling matches our selector, use it
            // If not, jump to the next sibling and continue the loop
            while (sibling) {
              if (sibling.matches(selector)) return sibling;
              sibling = sibling.previousElementSibling;
            }
          }

         return {
          league: getPreviousSibling(el, '.event__header').innerText || 'undefined',
          homeTeamName: el.querySelector('.event__participant.event__participant--home').innerText || 'undefined',
          awayTeamName: el.querySelector('.event__participant.event__participant--away').innerText || 'undefined',
          fullTimeScore: el.querySelector('.event__scores').innerText || 'undefined',
          halfTimeScore: el.querySelector('.event__part').innerText || 'undefined'
        } 
        })
      })
//       .filter(match => {
//         return starredLeagues.includes(match.league)
//       })
    ;

    await browser.close()

    let data = {
      status: 'success',
      matches: matches
    }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data, null, 3));
  } catch (err) {
    res.status(500).send(`Something went wrong: ${err}`)
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}!`);
});
