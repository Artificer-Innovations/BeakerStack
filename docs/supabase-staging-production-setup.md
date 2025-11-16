# Supabase Staging and Production Setup Guide

This guide walks you through setting up Supabase projects for staging and production environments.

## Overview

You'll create two separate Supabase projects:

- **Staging**: For testing before production (`staging.beakerstack.com`)
- **Production**: For live users (`beakerstack.com`)

Both will use your existing migrations in `supabase/migrations/` to set up the database schema.

## Prerequisites

- Supabase account (can create free projects)
- Supabase CLI installed locally (optional, for manual verification)
- Google OAuth credentials (same as used for preview)
- Access to GitHub repository secrets/variables

## Step 1: Create Supabase Projects

### 1.1 Create Staging Project

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click **New Project**
3. Fill in the form:
   - **Name**: `beakerstack-staging` (or your preferred name)
   - **Database Password**: Generate a strong password (save it - you'll need it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Pro ($25/month recommended) or Free tier
4. Click **Create new project**
5. Wait for project to initialize (~2 minutes)

### 1.2 Create Production Project

1. Still in Supabase Dashboard, click **New Project** again
2. Fill in the form:
   - **Name**: `beakerstack-production` (or your preferred name)
   - **Database Password**: Generate a strong password (save it - you'll need it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: **Pro ($25/month recommended)** - Production should not use free tier
3. Click **Create new project**
4. Wait for project to initialize (~2 minutes)

## Step 2: Collect Project Credentials

For each project (staging and production), collect these values:

### Finding Project Reference ID

1. Go to your Supabase project dashboard
2. Navigate to: **Settings** → **General**
3. Copy the **Reference ID** (e.g., `abc123xyz789`)
   - **Staging**: Save as `STAGING_SUPABASE_PROJECT_REF`
   - **Production**: Save as `PRODUCTION_SUPABASE_PROJECT_REF`

### Finding API URL and Anon Key

1. Navigate to: **Settings** → **API**
2. Copy the **Project URL** (e.g., `https://abc123xyz789.supabase.co`)
   - **Staging**: Save as `STAGING_SUPABASE_URL`
   - **Production**: Save as `PRODUCTION_SUPABASE_URL`
3. Copy the **anon public** key (long JWT token)
   - **Staging**: Save as `STAGING_SUPABASE_ANON_KEY`
   - **Production**: Save as `PRODUCTION_SUPABASE_ANON_KEY`

### Finding Database Password

You should have saved these when creating the projects. If not:

1. Navigate to: **Settings** → **Database**
2. You can view or reset the password here
   - **Staging**: Save as `STAGING_SUPABASE_DB_PASSWORD`
   - **Production**: Save as `PRODUCTION_SUPABASE_DB_PASSWORD`

### Getting Access Token (if you don't have one)

1. Go to: **Account Settings** → **Access Tokens** (top right corner)
2. Click **Generate new token**
3. Give it a name (e.g., "CI/CD Deployments")
4. Copy the token (you can only see it once!)
   - This is `SUPABASE_ACCESS_TOKEN` (same token works for all projects)

## Step 3: Apply Database Migrations

Your CI/CD will automatically apply migrations on first deploy, but you can also do it manually to verify everything works.

### Option A: Let CI/CD Handle It (Recommended)

Skip to Step 4 - when you set up the secrets and merge to `develop` or `main`, migrations will be applied automatically.

### Option B: Manual Setup (For Verification)

If you want to apply migrations manually first:

```bash
# Set your access token (one time)
export SUPABASE_ACCESS_TOKEN="your-access-token"

# Link and apply migrations to staging
export STAGING_SUPABASE_PROJECT_REF="your-staging-project-ref"
export STAGING_SUPABASE_DB_PASSWORD="your-staging-password"

cd supabase
supabase link --project-ref "${STAGING_SUPABASE_PROJECT_REF}" --password "${STAGING_SUPABASE_DB_PASSWORD}"
supabase db push --linked

# Link and apply migrations to production
export PRODUCTION_SUPABASE_PROJECT_REF="your-production-project-ref"
export PRODUCTION_SUPABASE_DB_PASSWORD="your-production-password"

supabase link --project-ref "${PRODUCTION_SUPABASE_PROJECT_REF}" --password "${PRODUCTION_SUPABASE_DB_PASSWORD}"
supabase db push --linked
```

## Step 4: Configure Authentication

### 4.1 Configure Google OAuth

Repeat for both **Staging** and **Production** projects:

1. Go to your Supabase project dashboard
2. Navigate to: **Authentication** → **Providers**
3. Find **Google** in the list
4. Toggle the switch to **Enable** Google provider
5. Fill in:
   - **Client ID (for OAuth)**: Your Google OAuth Client ID
   - **Client Secret (for OAuth)**: Your Google OAuth Client Secret
6. Click **Save**

### 4.2 Configure Google Cloud Console

Update your Google OAuth settings to include staging and production domains:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to: **APIs & Services** → **Credentials**
3. Click on your OAuth 2.0 Client ID

#### Add Authorized JavaScript Origins

Add both domains:

```
https://staging.beakerstack.com
https://beakerstack.com
```

#### Add Authorized Redirect URIs

You need to add the Supabase callback URL for **each project**:

**For Staging:**

```
https://<staging-project-ref>.supabase.co/auth/v1/callback
```

(Replace `<staging-project-ref>` with your actual staging project reference ID)

**For Production:**

```
https://<production-project-ref>.supabase.co/auth/v1/callback
```

(Replace `<production-project-ref>` with your actual production project reference ID)

### 4.3 Configure Site URLs

**For Staging:**

1. Go to staging Supabase project dashboard
2. Navigate to: **Authentication** → **URL Configuration**
3. Set **Site URL** to:
   ```
   https://staging.beakerstack.com
   ```
4. Add **Redirect URLs**:
   ```
   https://staging.beakerstack.com/auth/callback
   https://staging.beakerstack.com/**
   ```

**For Production:**

1. Go to production Supabase project dashboard
2. Navigate to: **Authentication** → **URL Configuration**
3. Set **Site URL** to:
   ```
   https://beakerstack.com
   ```
4. Add **Redirect URLs**:
   ```
   https://beakerstack.com/auth/callback
   https://beakerstack.com/**
   ```

### 4.4 Configure Email Confirmation

**For Staging:**

- **Recommended**: Disable email confirmation for easier testing
- Navigate to: **Authentication** → **Email Auth**
- Toggle "Confirm email" to **Disable**

**For Production:**

- **Recommended**: Enable email confirmation for security
- Navigate to: **Authentication** → **Email Auth**
- Toggle "Confirm email" to **Enable**

## Step 5: Set Up GitHub Secrets

Add these secrets to your GitHub repository:

### Navigate to GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** for each secret below

### Secrets to Add

#### Supabase Access Token (Shared)

- **Name**: `SUPABASE_ACCESS_TOKEN`
- **Value**: Your Supabase access token (from Step 2)

#### Staging Secrets

- **Name**: `STAGING_SUPABASE_URL`
- **Value**: Staging project URL (e.g., `https://abc123.supabase.co`)

- **Name**: `STAGING_SUPABASE_ANON_KEY`
- **Value**: Staging anon key (long JWT)

- **Name**: `STAGING_SUPABASE_PROJECT_REF`
- **Value**: Staging project reference ID (e.g., `abc123xyz789`)

- **Name**: `STAGING_SUPABASE_DB_PASSWORD`
- **Value**: Staging database password

#### Production Secrets

- **Name**: `PRODUCTION_SUPABASE_URL`
- **Value**: Production project URL (e.g., `https://xyz789.supabase.co`)

- **Name**: `PRODUCTION_SUPABASE_ANON_KEY`
- **Value**: Production anon key (long JWT)

- **Name**: `PRODUCTION_SUPABASE_PROJECT_REF`
- **Value**: Production project reference ID (e.g., `xyz789abc123`)

- **Name**: `PRODUCTION_SUPABASE_DB_PASSWORD`
- **Value**: Production database password

## Step 6: Verify Setup

### Test Staging Deployment

1. Merge a PR to `develop` branch
2. Check the GitHub Actions workflow `Deploy Staging`
3. Verify it:
   - Links to staging Supabase project
   - Applies migrations successfully
   - Deploys web app to `staging.beakerstack.com`

### Test Production Deployment

1. Merge a PR to `main` branch (or test on a feature branch first)
2. Check the GitHub Actions workflow `Deploy Production`
3. Verify it:
   - Links to production Supabase project
   - Applies migrations successfully
   - Deploys web app to `beakerstack.com`

## Summary Checklist

- [ ] Created staging Supabase project
- [ ] Created production Supabase project
- [ ] Collected all credentials (Project Ref, URL, Anon Key, DB Password)
- [ ] Configured Google OAuth in both projects
- [ ] Updated Google Cloud Console with callback URLs
- [ ] Configured Site URLs and Redirect URLs in both projects
- [ ] Set email confirmation preferences
- [ ] Added all secrets to GitHub repository
- [ ] Tested staging deployment
- [ ] Tested production deployment (carefully!)

## What Happens Next

Once secrets are configured:

1. **On merge to `develop`**:
   - Staging workflow runs
   - Applies any new migrations to staging database
   - Deploys web app to `staging.beakerstack.com`

2. **On merge to `main`**:
   - Production workflow runs
   - Applies any new migrations to production database
   - Deploys web app to `beakerstack.com`

Migrations are applied automatically - you don't need to run them manually!

## Troubleshooting

### Migrations Fail

- Check that `SUPABASE_ACCESS_TOKEN` is valid
- Verify project reference IDs are correct
- Ensure database passwords match
- Check GitHub Actions logs for specific errors

### OAuth Not Working

- Verify Google Cloud Console has correct callback URLs
- Check Site URL matches your domain
- Ensure Redirect URLs include your domain patterns
- Verify Google Client ID/Secret are correct in Supabase dashboard

### Deployment Fails

- Verify all GitHub secrets are set correctly
- Check AWS credentials are valid
- Ensure CloudFormation stack exists and has correct outputs
- Review deployment logs for specific errors

## Security Notes

- Never commit secrets to git
- Use Pro tier for production (not free tier)
- Enable email confirmation in production
- Regularly rotate access tokens and passwords
- Use different OAuth credentials per environment (optional but recommended)
