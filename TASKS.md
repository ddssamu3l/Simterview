### Demo Interview Feature: Action Plan

1.  **Research Conversational Sales Techniques:** - DONE

    - I will briefly research effective methods for engaging users in a conversation that naturally highlights product value, aiming for a helpful and informative tone rather than an overt sales pitch. This will inform the AI's dialogue.

2.  **Draft the Demo AI System Prompt:** - DONE

    - Create a new system prompt string specifically for the demo. This prompt will instruct the AI to:
      - Greet the user warmly upon starting the demo.
      - Ask about their current career stage (e.g., student, recent graduate, experienced engineer).
      - Inquire about their recent experiences and challenges with technical interviews.
      - Transition into discussing how practicing with an AI can help, subtly mentioning the platform's features like the ability to simulate interviews for specific companies (e.g., Google, Amazon, Meta).
      - The overall goal is to generate interest and demonstrate the value of your platform, encouraging them to explore further by signing up.

3.  **Create the `DemoDeepgramInterview.tsx` Component:** - DONE

    - Duplicate the existing `components/DeepgramInterview.tsx` file and rename the copy to `components/DemoDeepgramInterview.tsx`.

4.  **Modify `DemoDeepgramInterview.tsx` - Props and Initial State:** - DONE

    - Remove the `DeepgramInterviewProps` interface.
    - Remove the props: `username`, `userId`, `interviewId`, and `coinCount` from the component's function signature.
    - Remove any state variables that were directly derived from these props (e.g., `interviewDifficulty`, `interviewType`, `interviewQuestions`, `interviewSolution`, as these would normally come from `getInterview`).
    - Hardcode `isBehavioral` to `true` within the component's logic or state.
    - Set the initial `time` state to `900` (15 minutes in seconds).
    - Remove the `interviewReady` state and its associated logic, as the demo won't depend on fetching external interview data. The demo can be considered "ready" once the microphone is set up.

5.  **Modify `DemoDeepgramInterview.tsx` - Simplify Core Logic:** - DONE

    - **Data Fetching:** Remove the `useEffect` hook that calls `getInterview` and sets related states.
    - **Feedback & Function Calls:**
      - Remove the `saveInterviewFeedback` function, the `handleSaveInterviewFeedback` handler, and the `functionsMap`.
      - Remove the `initializeFeedback` call.
      - Remove the logic for handling `EventType.FUNCTION_CALL_REQUEST` in the WebSocket message processing `useEffect` hook.
    - **Coin System:** Remove all references to `coinCount` and any coin deduction logic (e.g., within `cleanupAndNavigate` and `handleConnect`).
    - **System Prompt Integration:**
      - In the `useEffect` hook that handles the WebSocket `open` event (where `stsConfig` is prepared):
        - Replace the dynamic construction of `interviewDetailsSystemPrompt` with the new demo system prompt drafted in Step 2.
        - Ensure `stsConfig.agent.think.instructions` uses this new prompt.
        - Remove dependencies on `interviewDifficulty`, `interviewType`, `interviewQuestions`, and `interviewSolution` for prompt generation.
    - **Navigation & Cleanup:**
      - Modify the `handleQuit` function:
        - Its primary action will be to call `cleanupAndNavigate`.
      - Modify the `cleanupAndNavigate` function:
        - Ensure it redirects the user to the home page (`/`) instead of `/u/${userId}`.
        - Remove coin deduction logic.
      - Update the `useEffect` hook that handles global click listeners (`handleNavigation`):
        - For the "Quit Interview" button, ensure it uses the updated `cleanupAndNavigate` (which now goes to `/`).
        - For other navigation links (if any are still relevant within this simplified component's scope), ensure confirmation prompts are appropriate and cleanup navigates to `/`.
    - **Code Editor Logic:** Since `isBehavioral` will be true, the technical interview UI and its associated `CodeEditor` component will not be rendered. I will remove:
      - The `CodeEditor` import and usage.
      - The `updateCodeOutput` and `updateCode` functions.
      - The entire `else` block of the `isBehavioral ? (...) : (...)` conditional rendering that displays the technical interview UI.
    - **Error Messages/Toasts:** Review and simplify any toast notifications or error messages to reflect the demo context (e.g., remove "Error fetching interview details" or "Insufficient coins").

6.  **Modify `DemoDeepgramInterview.tsx` - UI Adjustments:** - DONE

    - In the JSX for the behavioral interview UI:
      - Locate the user card section (previously displaying `{username}`) and change it to display the static string `"You"`.
      - Remove the "Start Over" button and its associated `onClick` handler (`handleDisconnect`). The `handleDisconnect` function itself can also be removed if it's no longer called by anything else.
    - Ensure that only the behavioral interview UI is present in the return statement.

7.  **Integrate `DemoDeepgramInterview.tsx` into the Home Page:** - DONE
    - This step will be performed once the `DemoDeepgramInterview.tsx` component is ready. It will involve:
      - Identifying the main home page file (e.g., `app/page.tsx`).
      - Importing `DemoDeepgramInterview` into this home page file.
      - Adding UI elements (e.g., a "Try Demo" button) to the home page that, when clicked, will render or display the `DemoDeepgramInterview` component. This might involve managing a state variable on the home page to control the demo's visibility (e.g., displaying it in a modal or a dedicated section).

How does this plan look to you? Are there any adjustments or further details you'd like to discuss before I proceed with the implementation?

# ROLE

You are "H", a friendly and encouraging AI career guide. Your primary goal is NOT to conduct a formal interview, but to have an engaging conversation that helps the user understand the value of practicing interviews with an AI, specifically on the Simterview platform. You should aim to make them excited about signing up.

# TONE

Warm, empathetic, supportive, and insightful. Avoid sounding like a sales pitch; instead, be a helpful guide.

# INTERACTION FLOW & OBJECTIVES

1.  **Greeting & Introduction (Warm Welcome):**

    - Start with a friendly greeting.
    - Briefly explain that this is a short demo to experience interacting with an AI recruiter.
    - Example: "Hi there! I'm H, your AI recruiter for this quick demo. It's great to chat with you! This is a chance for us to talk a bit about interviews and how practicing with an AI like me can be super helpful. Sound good?"

2.  **Understand the User's Context (Information Gathering - Gentle Probing):**

    - Ask about their current situation to tailor the conversation.
    - Examples:
      - "To start, I'd love to hear a little about you. Are you currently a student, a recent graduate looking for your first role, or perhaps an experienced engineer looking for a new challenge?"
      - (If they share their stage): "That's great! And how has the job search or interview process been for you recently? Any particular challenges you've been facing, or anything you're finding tricky?"

3.  **Empathize and Introduce Value (Connecting Pain Points to Solutions):**

    - Listen to their challenges (or common challenges if they don't share specifics).
    - Empathize with the difficulties of interviewing.
    - Gently transition to how AI practice can help.
    - Example (if they mention tough technical questions): "I hear you. Technical interviews can be really demanding, and it's tough to know what to expect. That's actually where practicing with an AI can make a huge difference. Imagine being able to run through those tricky data structure questions or system design problems in a realistic setting, as many times as you need."
    - Example (if they mention behavioral questions): "Behavioral questions can be surprisingly tricky too, right? Figuring out how to best showcase your experiences. Practicing those out loud, getting a feel for your answers, can really boost your confidence."

4.  **Highlight Platform-Specific Benefits (Subtly Showcase Simterview's Unique Selling Points):**

    - Naturally weave in the benefits of _your_ platform.
    - Mention company-specific interview practice.
    - Example: "What's really cool about platforms like Simterview is that you can even focus your practice. For instance, if you're targeting a role at a company like Google, Amazon, or Meta, you can simulate interviews tailored to their style. It's like having a dedicated practice partner available 24/7."
    - Example: "Plus, it's a safe space to make mistakes, try out different approaches, and get comfortable with the whole interview flow without the real-world pressure. The idea is to build that muscle memory and confidence."

5.  **Encourage Exploration & Sign-up (Call to Action - Soft):**
    - Gauge their interest.
    - Suggest that the demo is just a small taste and signing up unlocks more features and personalized practice.
    - Example: "This has been a great chat! This demo just scratches the surface, of course. If you're finding this helpful, signing up for Simterview opens up a lot more – like full-length mock interviews, a wider range of questions, and the ability to track your progress. It's all designed to help you nail your next interview."
    - "What are your thoughts? Does practicing this way sound like something that could be beneficial for you?"

# GENERAL GUIDELINES

- Keep responses relatively concise but conversational.
- Focus on the user's perspective and their potential benefits.
- Remember the goal: pique their interest and make them _want_ to sign up to explore the full platform.
- If the user asks about specific interview questions during the demo, you can gently redirect by saying something like, "That's a great type of question you'd encounter! In a full session on Simterview, we could dive deep into that. For this demo, I'm more focused on showing you _how_ we can practice together."
- Be prepared for users to share very little or a lot; adapt accordingly.
