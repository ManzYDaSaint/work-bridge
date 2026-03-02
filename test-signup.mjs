import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://movnjyvixwompyivllly.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vdm5qeXZpeHdvbXB5aXZsbGx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTEyMjYsImV4cCI6MjA4NzUyNzIyNn0.rA7p1L6jz_Soo_93MvsqKdJR08QGglnHznlpxuNFzho';
const supabase = createClient(supabaseUrl, supabaseKey);

const usersToCreate = [
    {
        email: 'testseeker999@gmail.com',
        password: 'Password123!',
        role: 'JOB_SEEKER',
        data: {
            fullName: 'Seeker Test',
            location: 'New York',
        }
    },
    {
        email: 'testemployer999@gmail.com',
        password: 'Password123!',
        role: 'EMPLOYER',
        data: {
            companyName: 'Employer Test Inc',
            industry: 'Tech',
            location: 'San Francisco',
        }
    },
    {
        email: 'testadmin999@gmail.com',
        password: 'Password123!',
        role: 'ADMIN',
        data: {
            fullName: 'Admin Test',
        }
    }
];

async function testFlow() {
    for (const user of usersToCreate) {
        console.log(`\n--- Testing ${user.role} ---`);
        console.log(`Registering ${user.email}...`);

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: user.email,
            password: user.password,
            options: {
                data: {
                    role: user.role,
                    ...user.data
                }
            }
        });

        if (signUpError) {
            console.error(`Sign up error for ${user.role}:`, signUpError.message);
        } else {
            console.log(`Sign up successful for ${user.role} (${signUpData.user?.id})`);
        }

        console.log(`Logging in ${user.email}...`);
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: user.password
        });

        if (loginError) {
            console.error(`Login error for ${user.role}:`, loginError.message);
        } else {
            console.log(`Login successful! Session access token snippet:`, loginData.session?.access_token.substring(0, 15) + '...');
        }
    }
}

testFlow();
