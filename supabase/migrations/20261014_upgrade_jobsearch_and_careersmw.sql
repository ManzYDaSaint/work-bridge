-- Upgrade JobSearch MW and Careers MW Ingestion Sources
-- 1. Careers MW: Switched from 3-item RSS to 50-item REST API endpoint
-- 2. JobSearch MW: Enabled multi-page RSS crawl (3 pages = 30 jobs) & shortened crawl frequency to 120 mins

UPDATE public.job_ingestion_sources
SET
    name = 'Careers Malawi (API)',
    connector_type = 'REST_API',
    feed_url = 'https://careersmw.com/wp-json/wp/v2/job_listing?per_page=50',
    selector_config = '{"idKey": "id", "titleKey": "title"}'::jsonb,
    crawl_frequency_minutes = 240,
    updated_at = NOW()
WHERE slug = 'careers-malawi-rss';

UPDATE public.job_ingestion_sources
SET
    name = 'JobSearch MW (RSS Multi-Page)',
    connector_type = 'RSS',
    feed_url = 'https://jobsearchmalawi.com/feed/?post_type=job_listing',
    selector_config = '{"maxPages": 3}'::jsonb,
    crawl_frequency_minutes = 120,
    min_frequency_minutes = 30,
    updated_at = NOW()
WHERE slug = 'jobsearch-mw-rss';
