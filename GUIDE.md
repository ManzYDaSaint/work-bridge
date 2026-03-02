# 🚀 New Idea Launch Guide (5-Minute Workflow)

Follow these steps every time you have a new micro SaaS idea.

## 1. Environment Prep
- Clone this repo into a new folder: `git clone nextjs-starter-kit my-new-idea`
- Create a new project on [Supabase](https://supabase.com).
- Copy your API keys to `.env.local`.

## 2. Define Your Data
- Go to the **Supabase SQL Editor**.
- Run the `SQL` schema from the [README](README.md#💾-database-schema-supabase-sql) to set up the `notes` table (or adapt it for your idea).
- Enable **RLS** (Row Level Security) so users only see their own data.

## 3. Design Your Landing Page
- Open `src/app/(marketing)/page.tsx`.
- Update the **Hero** text, **Features**, and **FAQ** sections to match your idea.
- Change the `data-theme` in `src/app/layout.tsx` to match your brand (e.g., `dark`, `light`, `cupcake`).

## 4. Build Your Core Logic
- Add your app screens in `src/app/(app)/dashboard`.
- Create new **Server Actions** in `actions.ts` for your specific logic (use the `notes` example as a template).
- Use `zod` validation for every action.

## 5. Set Your Price
- Update `src/app/(marketing)/pricing/page.tsx` with your local currency and plans.
- Create your payment links in your **Flutterwave** dashboard and update `src/lib/payments.ts`.

## 6. Verify and Ship
- Run `npm run check` to ensure no bugs, type errors, or lint issues.
- Connect your GitHub repo to **Vercel**.
- Add your environment variables to Vercel.
- **Push to main.**

🔥 **You are now live.**
