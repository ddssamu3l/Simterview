# Simterview - SWE interviews against AI recruiters
- Simterview lets Software Engineers practice behavioral and technical interviews with an AI interviewer to unlock more career opportunities.

<img width="1248" alt="截屏2025-03-31 下午4 02 34" src="https://github.com/user-attachments/assets/215aed60-d99d-465a-ba2c-009870ebd9c0" />


# Testing Checklist

## **Authentication**
- **Sign in** with GitHub
- **Sign up** with GitHub
- **Sign in** with email
- **Sign up** with email

## **Generate Interview**
- Generate **behavioral** interview
- Generate **technical** interview
- Ensure correct **problem type** (algorithms vs SQL vs systems)
- Verify **problem description** and **editorial** are correct
- After generation, check if a new **feedback record** is created in the user’s profile

## **Interview List**
- All **public interviews** display correctly
- Show **feedback indicator** on interviews user has taken
- Clicking a taken public interview redirects to **/feedback/[id]**, not **/live-interview/[id]**
- **Retake button** redirects to correct **/live-interview/[id]**
- Retake interview shows **same problem**
- Interviews are sorted by **createdOn (latest first)**

## **User Profile**
- Displays correct **email**, **user ID**, **join date**, and **coin count**
- Shows one **feedback card** per unique interview

## **Feedback Card**
- Shows actual **feedback contents** (not "No feedback available")
- **Retake button** links to correct interview

## **Live Interview**

### Before Start
- **URL interviewId** matches generated interview
- Browser prompts for **microphone access**
- If **"Allow"**: No warnings
- If **"Don’t allow"**: Show **warning message**, block interview start
- If mic not allowed, show **"Turn on microphone access"** button
- Clicking it should re-prompt mic permissions

### On Start
- Clicking **Start Interview** loads interview UI
- Shows correct UI: **behavioral** or **technical (text editor)**
- **Deepgram AI agent mounts**
- **Microphone is on** (button says “mute microphone”)
- AI agent **greets candidate** (audio works)

### During Interview
- User can **speak with AI recruiter**
- Conversation is **fluid**, with no noticeable lag

### Technical Interview
- **Run button** works and returns output
- Recruiter can **see candidate’s code and output** (ask questions to confirm)

### "Start Over" Button
- Shows **alert warning** on click
- Resets to **Start Interview** screen
- **Timer resets**, AI audio stops, Deepgram dismounts

### "Quit Interview" Button
- Shows **confirmation warning**
- On click: mic and Deepgram dismount
- Redirects to **user profile**
- Check if **coin deduction** happens (currently disabled)

## **Feedback**
- At interview end, check if **`saveInterviewFeedback()`** is called in dev console
- Ensure feedback fields are present: **passed**, **finalAssessment**, **strengths**, **areasForImprovement**
- After quitting, check **user profile** to confirm feedback card has content
