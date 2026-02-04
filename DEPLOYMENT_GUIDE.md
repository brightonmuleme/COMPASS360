# How to Deploy Your App (Get it Online)

Since your backend is already hosted on AWS (`https://tp90o4o29f...`), you only need to deploy your **Frontend** (this Next.js application).

Here are the two best options:

---

## Option 1: Vercel (Easiest & Fastest)
Vercel is the company behind Next.js, so it offers the smoothest deployment experience.

### Steps:
1.  **Push your code to GitHub**:
    *   Create a repository on GitHub.
    *   Push your local code to it.
    ```bash
    git init
    git add .
    git commit -m "Ready for deployment"
    git branch -M main
    git remote add origin <your-github-repo-url>
    git push -u origin main
    ```

2.  **Sign up for Vercel**:
    *   Go to [vercel.com](https://vercel.com) and sign up (login with GitHub).

3.  **Import Project**:
    *   Click "Add New..." -> "Project".
    *   Select your GitHub repository (`school-platform`).

4.  **Configure Environment Variables** (Critical!):
    *   In the "Environment Variables" section of the Vercel import screen, copy the values from your local `.env.local` file:
    *   `NEXT_PUBLIC_API_URL`: `https://tp90o4o29f.execute-api.eu-central-1.amazonaws.com/Prod`
    *   `NEXT_PUBLIC_COGNITO_REGION`: `eu-central-1`
    *   `NEXT_PUBLIC_COGNITO_USER_POOL_ID`: `eu-central-1_rOO3xcPg4`
    *   `NEXT_PUBLIC_COGNITO_CLIENT_ID`: `5nee5co74p6duaec6p63603egi`

5.  **Deploy**:
    *   Click "Deploy".
    *   Wait ~1 minute. You will get a live URL (e.g., `https://school-platform.vercel.app`) that you can share with anyone!

---

## Option 2: AWS Amplify (Best for AWS Integration)
Since you are already using AWS for the backend, you might want to keep everything there.

### Steps:
1.  **Push to GitHub** (Status same as above).

2.  **AWS Console**:
    *   Go to **AWS Amplify** in the AWS Console.
    *   Click **"Create New App"** -> **"Host web app"**.

3.  **Connect Repo**:
    *   Select GitHub and authorize.
    *   Choose your `school-platform` repository and `main` branch.

4.  **Build Settings**:
    *   Amplify usually detects Next.js automatically.
    *   If asked, ensure the build command is `npm run build` and output directory is `.next`.

5.  **Environment Variables**:
    *   Click "Advanced Settings" -> "Environment Variables".
    *   Add the same key-value pairs from your `.env.local` file (listed in Option 1).

6.  **Deploy**:
    *   Click "Save and Deploy".

---

## ⚡ Important Note on "Redirects" (SPA Routing)
For both platforms, because you are building a Single Page App, routing usually works out of the box with Next.js.
However, if you encounter 404 errors when refreshing a page (like `/student`), you shouldn't need extra config if using Vercel or Amplify's Next.js adapter.

## Which one should I choose?
*   **Choose Vercel** if you want it online in 5 minutes with zero configuration.
*   **Choose AWS Amplify** if you want to manage billing/hosting all in one AWS bill.
