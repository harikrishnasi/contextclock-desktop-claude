# ContextClock for Claude Desktop 🕰️

**Give Claude the gift of time.**

ContextClock is a powerful, highly-configurable Model Context Protocol (MCP) extension for Claude Desktop that natively injects real-time temporal awareness into every conversation.

---

## 🛑 The Problem: Claude is Stuck in a Timeless Void
By default, Claude has **absolutely no concept of the current time, day, or date**. If you ask Claude "What should I work on today?", it doesn't know if "today" is a busy Tuesday morning or a lazy Sunday night. 

To get accurate, time-sensitive help, users are forced to constantly preface their prompts with *"Today is Friday at 4 PM..."*. If you leave a chat open for three hours and come back, Claude still thinks it's exactly the moment you opened the window.

## ⚡ The Solution: ContextClock
ContextClock completely eliminates this limitation by running a silent, background MCP server that **forces Claude to check the clock**. It seamlessly injects your local time, your working status, and the current date directly into Claude's system prompt before it ever generates a response.

### ✨ Key Features
- **Total Temporal Awareness:** Claude instantly knows the exact time, date, and period of the day (Morning, Afternoon, Evening, Night).
- **Personalized Work Styles:** Tell Claude exactly when you are "on the clock". Through a beautiful installation UI, you can configure your specific working hours (e.g., 9 AM to 5 PM) and individually toggle which days of the week you work. Claude will adapt its tone and suggestions based on whether you are On-duty or having a Day Off.
- **Intelligent Auto-Refresh:** Left a chat open while you went to lunch? ContextClock tracks how long it has been since Claude last checked the time. If the context is stale, it forces a silent refresh before answering your next prompt.
- **Global Timezone Converter:** Includes a built-in `convert_timezone` tool so Claude can instantly tell you the exact time for your remote team members anywhere in the world.

---

## 🎯 Real-World Use Cases

**1. Context-Aware Productivity**
> *"I need you to write a complex Python script."*
If ContextClock tells Claude it's 2:00 AM on a Saturday (and you have Saturday checked as a "Day Off"), Claude can intelligently remind you that it's late and perhaps you should rest, or it will provide a more concise answer rather than dragging you into a 3-hour coding rabbit hole.

**2. Daily Planning & Briefings**
> *"Help me plan out the rest of my day."*
Claude instantly knows it is currently 3:15 PM on a Tuesday. It won't suggest a full 8-hour workflow; instead, it will help you prioritize exactly what you can accomplish before your 5:00 PM configured "Clock Out" time.

**3. Remote Team Collaboration**
> *"I need to schedule a meeting with the Tokyo team right now, draft an email."*
Claude will automatically trigger the `convert_timezone` tool, check the time in `Asia/Tokyo`, and draft the email stating *"Since it's currently 8:00 AM your time tomorrow..."* without you needing to do any mental math.

---

## 🚀 Installation & Configuration

1. Download the latest `contextclock-desktop-claude.mcpb` file from the [Releases](#) page.
2. Open Claude Desktop, click on your profile picture, and select **Settings** -> **Extensions**.
3. Drag and drop the `.mcpb` file into the window.
4. **Configure Your Life:** The installation window will prompt you to set your:
   - **Refresh Interval:** How often Claude should check for stale time (Default: 30 mins).
   - **Work Start / End Hour:** Your daily working hours (Default: 9 to 17).
   - **Working Days:** 7 individual checkboxes to explicitly define your work week!
5. Click **Install**. 

That's it! Open a new chat and ask Claude: *"What is my working status right now?"*

---

**Developed by Hari Krishna S I**
*Built with ❤️ using the Model Context Protocol.*
