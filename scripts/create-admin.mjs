import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cpsvaupftkagflzavmah.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwc3ZhdXBmdGthZ2ZsemF2bWFoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjA2MjA0NCwiZXhwIjoyMDgxNjM4MDQ0fQ.UFNnERZEiF3uXJR2rQDVaJ5qzmedx7bJi24USUi4Nec';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdmin() {
  const email = 'admin@openchat.local';
  const password = 'Admin123!';
  const displayName = 'System Administrator';

  console.log('Creating admin user...');

  // Create auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (authError) {
    console.error('Auth error:', authError.message);
    return;
  }

  console.log('Auth user created:', authUser.user.id);

  // Create profile with admin role
  const { error: profileError } = await supabase.from('profiles').insert({
    id: authUser.user.id,
    role: 'admin',
    display_name: displayName
  });

  if (profileError) {
    console.error('Profile error:', profileError.message);
    // Cleanup auth user
    await supabase.auth.admin.deleteUser(authUser.user.id);
    return;
  }

  console.log('\n✅ Admin account created successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Email:    ', email);
  console.log('Password: ', password);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\nLogin at: http://localhost:3000/login');
}

createAdmin();
