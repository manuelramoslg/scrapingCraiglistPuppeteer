const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const  Listing = require('./models/Listing');

async function connectToMongoDb() {
    await mongoose.connect(
        "mongodb+srv://manuelramoslg:quieroamigos1@udemycraiglist.upt3e.mongodb.net/udemyCraiglist?retryWrites=true&w=majority",
        { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Conectado a mongo')
}

async function scrapeListings(page) {
    await page.goto('https://sfbay.craigslist.org/d/software-qa-dba-etc/search/sof');
    const html = await page.content();
    const $ = cheerio.load(html);
    // Querys usadas para encontrar los títulos y url
    // $('.result-title').each((index, element) => console.log($(element).text()));
    // $('.result-title').each((index, element) => console.log($(element).attr('href')));
    // Se busca el elemento padre que contiene todos los datos result-info
    return $('.result-info').map((index, element) => {
        const titleElement = $(element).find('.result-title');
        const timeElement = $(element).find('.result-date');
        const hoodElement = $(element).find('.result-hood');
        const title = $(titleElement).text();
        const url = $(titleElement).attr('href');
        const datePosted = new Date($(timeElement).attr('datetime'));
        const hood = $(hoodElement)
            .text()
            .trim()
            .replace('(','')
            .replace(')','')
        return { title, url, datePosted, hood }
    }).get(); // hay que agregar el get cuando se usa el map en node
}
async function scrapeJobDescriptions(listings, page) {
    for (var i = 0; i < listings.length; i++) {
        console.log(`Listing number ${i}`)
        await page.goto(listings[i].url);
        const html = await page.content();
        const $ = cheerio.load(html);
        const jobDescription = $("#postingbody").text().replace('QR Code Link to This Post','').trim();
        const jobCompensation = $('p.attrgroup > span:nth-child(1) > b').text().trim();
        listings[i].jobDescription = jobDescription;
        listings[i].compensation = jobCompensation;
        debugger

        // Como aquí ya se encuentran presnete todos los datos aprovecharé para persistir persistir
        const listingModel = new Listing(listings[i]);
        await listingModel.save()
        await sleep(1000); //1 second sleep
    }
}

async function sleep(miliseconds){
    return new Promise(resolve => setTimeout(resolve, miliseconds));
}

async function main() {
    await connectToMongoDb()
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    const listings = await scrapeListings(page);
    await scrapeJobDescriptions(
        listings,
        page
    );
    console.log('The End')
    await browser.close();
}

main();