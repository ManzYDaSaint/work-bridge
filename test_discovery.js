const { CareerPageConnector } = require('./src/lib/ingestion/connectors');
const source = {
    name: 'Test Source',
    base_url: 'https://example-career-site.com', // Replace with the real source URL
    connector_type: 'CAREER_PAGE',
    selector_config: {
        maxLinks: 50,
    }
};

async function testDiscovery() {
    const connector = new CareerPageConnector();
    try {
        const jobs = await connector.discoverJobs(source);
        console.log('Discovered', jobs.length, 'jobs:');
        console.table(jobs.map(j => ({ title: j.title, url: j.url })));
    } catch (e) {
        console.error(e);
    }
}
testDiscovery();
