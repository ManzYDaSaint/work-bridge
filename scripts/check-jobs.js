const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkJobs() {
    const { data, error } = await supabase
        .from('jobs')
        .select('id, title, status')
        .limit(20)

    if (error) {
        console.error('Error fetching jobs:', error)
        return
    }

    console.log('Jobs in database:')
    data.forEach(job => {
        console.log(`- ID: ${job.id}, Title: ${job.title}, Status: [${job.status}]`)
    })

    const statuses = [...new Set(data.map(j => j.status))]
    console.log('\nUnique statuses found:', statuses)
}

checkJobs()
