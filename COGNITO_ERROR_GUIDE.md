# ⚠️ Critical Cognito Configuration Error

## The Error
**`NotAuthorizedException: Client <id> is configured with secret but SECRET_HASH was not received`**

## Why this is happening
The AWS Cognito App Client ID you provided (`jjacpuor639d3m8sudn7hp0u5`) was created with a **Client Secret**.
Browser-based applications (like this one) **cannot** use Client Secrets securely. Therefore, the authentication library (Amplify) attempts to login without it, and AWS Cognito rejects the attempt.

## How to Fix (Step-by-Step)

1.  Log into your **AWS Console**.
2.  Navigate to **Amazon Cognito** > **User Pools**.
3.  Click on the User Pool ID: **`eu-central-1_rOO3xcPg4`**.
4.  Navigate to the **App integration** tab.
5.  Scroll down to **App clients and analytics**.
6.  Click **Create app client**.
7.  **Select** "Public client".
8.  **IMPORTANT**: Look for **"Generate client secret"** and make sure it is **UNCHECKED** (Disabled).
9.  Name it something like `school-platform-frontend`.
10. Click **Create app client**.
11. Copy the **New Client ID**.

## Action Required
Once you have the new Client ID, please paste it in the chat, and I will update the configuration.
