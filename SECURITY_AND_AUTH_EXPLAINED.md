# COMPASS 360: Security & Authentication Report

## 1. How The Login "Logic" Works
The login system is an intelligent "Traffic Controller". It doesn't just let people in; it decides *where* they go based on who they are.

### The Flow
1.  **Input**: User enters `username` + `password`.
2.  **Verification (The Guard)**:
    *   The app sends these credentials securely to **AWS Cognito** (Amazon Web Services).
    *   AWS checks its secure vault.
    *   **Success**: AWS returns a digital "Access Key" (Token).
    *   **Failure**: AWS returns an error (WRONG_PASSWORD).
3.  **Inspection (The Role Check)**:
    *   The app looks inside the digital "Access Key".
    *   It finds a specific stamp called `nickname`.
    *   We use this `nickname` field to store the Role: "Director", "Bursar", "Student", or "Tutor".
4.  **Routing (The Traffic Cop)**:
    *   **If 'Director'**: Redirect to `/portal` (Staff Selection).
    *   **If 'Student'**: Redirect to `/student` (Student Dashboard).
    *   **If 'Tutor'**: Redirect to `/tutor` (Tutor Dashboard).

---

## 2. Security Assessment: How Safe Is It?

### ✅ Strengths (What is Secure)
1.  **Password Storage**:
    *   We **NEVER** save passwords in your app code or database. They are hashed and salted by Amazon. Even you (the developer) cannot see a user's password.
2.  **Transmission**:
    *   All login data is sent over **HTTPS (SSL)**. It cannot be intercepted by someone watching the WiFi.
3.  **Session Management**:
    *   If a user leaves their computer open, the "Access Key" expires automatically (usually after 1 hour), forcing a re-login.

### ⚠️ Current Weaknesses (Demo Mode)
These are intentional "weaknesses" present only because we are in **Development/Demo Phase**.

1.  **The "Magic" Demo Accounts**:
    *   *Issue*: I added code to let `PAY-001`, `director`, and `bursar` log in *without* checking AWS.
    *   *Risk*: If this code stays in the final version, anyone who guesses "director" / "password123" can get in.
    *   *Fix*: **One-line deletion.** When you are ready to "Go Live" for a real client, we delete the `// 0. BYPASS FOR DEMO ACCOUNTS` block in `SignUpModal.tsx`.

2.  **Data Persistence (The Database)**:
    *   *Issue*: Currently, student grades and fee records are stored in "Mock Data" (Javascript files) or Local Storage on the user's browser.
    *   *Risk*: If a Bursar clears their browser history, they might lose the "Unsaved" local edits.
    *   *Fix*: This is the next phase of development. We need to connect the App to a **Real Database** (like Postgres or DynamoDB) so data lives in the cloud, not the browser.

### 3. Recommendation for Next Steps
To make this "School-Ready":
1.  **Keep the Login** (It is solid).
2.  **Connect a Real Database**: We should stop using "Mock Data" for students and start saving them to the Cloud.
3.  **Delete the Demo Accounts**: Remove the bypass code before handing it to a customer.

## 4. Can Schools See Each Other's Data? (Tenant Isolation)

This is the most critical security question for a SaaS platform.

### The "School ID" Rule
In the real database, every single record (Student, Fee, Result) will have a `school_id` tag.

*   **Student Table Exmaple**:
    | Name | Grade | **School_ID** (The Lock) |
    | :--- | :--- | :--- |
    | John Doe | A | `school_A` |
    | Jane Smith | B | `school_B` |

### How Blocking Works
When "School A" logs in, the API automatically adds a filter to **every** request:
> `SELECT * FROM students WHERE school_id = 'school_A'`

Even if School A tries to "hack" the URL to see student #102, the database checks: *"Does Student #102 belong to School A?"*
*   If **Yes**: Show it.
*   If **No**: Access Denied.

This ensures **Strict Data Privacy** between clients.
