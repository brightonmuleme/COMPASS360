# DATABASE SETUP GUIDE (Crucial for "Go Live")

## 1. Why do we need a Database?
Right now, if a School signs up on their computer, the data stays on *their* computer (Local Storage). You (the Admin) cannot see it on *your* computer to validate them.
To "see" each other, you need a shared brain in the cloud: **The Database**.

## 2. Recommended Solution: Supabase (PostgreSQL)
We recommend **Supabase** because:
1.  **It uses SQL**: The standard for serious data (Students, Fees, Relations).
2.  **Authenticated**: It integrates perfectly with your Login logic.
3.  **Real-Time**: You can see signups instantly as they happen.
4.  **Free Tier**: Generous free usage for testing.

## 3. How to "Get" the Database

### Step A: Create Project
1.  Go to [supabase.com](https://supabase.com) and Sign Up.
2.  Click **"New Project"**.
3.  Name it `compass-360-db`.
4.  Set a strong password.
5.  Region: `Europe (Frankfurt)` or `US East` (closest to you).

### Step B: Connect to App
1.  In Supabase, go to **Settings > API**.
2.  Copy `Project URL` and `anon public key`.
3.  Open your project `.env.local` file (create it if missing) and paste:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_project_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
    ```

### Step C: Create Tables (The Schema)
Go to **SQL Editor** in Supabase and run this script to create your core tables:

```sql
-- 1. Schools Table (For your Developer Portal)
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'active', 'rejected'
  subscription_plan TEXT DEFAULT 'basic',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Users Table (Links to Schools)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  role TEXT, -- 'director', 'student', 'tutor'
  school_id UUID REFERENCES schools(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 4. How the "Developer Portal" will work
Once this database is active:
1.  **Signup**: A school fills a form. We save to `schools` table with `status = 'pending'`.
2.  **Validation**: You log into your Developer Dashboard. The app fetches `SELECT * FROM schools WHERE status = 'pending'`.
3.  **Approval**: You click "Approve". We run `UPDATE schools SET status = 'active'`.
4.  **Login**: Next time they log in, we check: `IF status == 'active' -> ALLOW`.

## Next Action
Reply with "Ready" if you have created the Supabase project, and I will give you the code to connect it!
