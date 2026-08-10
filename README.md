# Fishyy Timer + Study Plan

A local-first study timer and plan-execution dashboard that remembers what you did.

### Prompt to edit the style of the spreadsheet to one that matches the requirements of the app: 
- Plug the original calendar into a llm and covert. Ensure the content is not changing, simply the presentation. 

```markdown
Create a study timetable as an Excel-compatible table for importing into Fishyy Study Planner.

WORKSHEET REQUIREMENTS

- Name the worksheet exactly: Daily Plan
- Put column headers in row 1.
- Do not use merged cells, decorative title rows, blank rows between tasks, subtables, or multiple header rows.
- Each row must represent exactly one study session.
- Use plain cell values rather than formulas.
- Sort all sessions chronologically by Date and Start Time.

USE THESE EXACT COLUMN HEADERS

Date
Start Time
End Time
Subject
Topic
Planned Duration
Notes
Priority
Task Type
Exam Date

FORMATTING RULES

- Date: use YYYY-MM-DD, for example 2026-08-12.
- Start Time and End Time: use 24-hour HH:MM format, for example 18:00 and 19:30.
- Subject: use one consistent subject name throughout the workbook.
- Topic: describe the exact activity or topic for that session.
- Planned Duration: use minutes, for example 90 min.
- Notes: optional short instructions; leave blank if unnecessary.
- Priority: use High, Medium, or Low.
- Task Type: use one of:
  - Concept Revision
  - Questions
  - Past Paper
  - Error Review
  - Notes
  - Other
- Exam Date: use YYYY-MM-DD. Repeat the subject’s exam date on its study-session rows or leave blank if unknown.
- Ensure End Time minus Start Time matches Planned Duration.
- Do not place totals, weekly summaries, planned net hours, statistics, or exam countdowns in the Daily Plan worksheet.
- If a Dashboard or Summary worksheet is created, keep it separate from Daily Plan.

SUBJECT NAMING

Use consistent names such as:

- Math AA HL
- Physics HL
- Computer Science HL
- French B SL
- Chemistry SL
- English SL

Do not alternate between abbreviations such as “Math,” “Mathematics,” and “Math AA HL.”

EXAMPLE

Date,Start Time,End Time,Subject,Topic,Planned Duration,Notes,Priority,Task Type,Exam Date
2026-08-12,16:30,17:30,Physics HL,Electromagnetic Fields,60 min,Review field equations,High,Concept Revision,2026-09-20
2026-08-12,17:40,19:10,Math AA HL,Calculus – Integration Questions,90 min,Questions 1–18,High,Questions,2026-09-15
2026-08-12,19:40,20:40,French B SL,Reading Comprehension,60 min,Complete one timed passage,Medium,Past Paper,2026-09-28

Now generate my complete study timetable using this exact structure based on the following requirements:

[PASTE MY SUBJECTS, AVAILABLE STUDY HOURS, EXAM DATES, TOPICS, BREAK REQUIREMENTS, AND DATE RANGE HERE]

Return the completed timetable as an Excel workbook or CSV without changing the column names.
```

## Study plan workflow

Open `index.html` directly or publish it with GitHub Pages. The default **Today** view imports `.xlsx`, `.xls`, and `.csv` timetables, previews detected rows, maps flexible columns, and turns confirmed rows into live calendar blocks. Plan data, task changes, timer segments, completion records, daily scores, exams, and analytics are stored in IndexedDB.

Each imported block preserves its original subject, topic, and duration. You can freely substitute another topic within the same subject; changing the subject is a separate confirmed override. Focused time is calculated from persisted run segments, excluding pauses, and active timers recover from saved timestamps after refresh.

The Data view provides JSON backup and restore. Spreadsheet contents and study records are never uploaded by the application.

There is no build step, server, account, environment variable, or API. Push `index.html` to GitHub Pages and it runs as a hash-navigated static app.

Excel import uses the official SheetJS browser build from its CDN. CSV import and all stored plan/timer functionality use browser APIs; Excel import needs connectivity when the external script has not already loaded.

## Why this exists

Most timers only care about the number currently ticking on the screen. The second you close the tab, that information is gone, you have no idea if you studied more this week than last, whether Tuesdays are secretly your worst day, or if that "quick 20-minute review" has quietly become your most time-consuming habit.

Fishyy Timer was built to fix that. The point isn't just to time a study session, it's to build up a real, honest record of *when* you study, *what* you study, and *how consistently* you actually show up. Once that record exists, patterns show up on their own: streaks, slumps, the subjects you keep avoiding, the days that quietly disappear. Awareness first, improvement second, you can't fix a habit you can't see.

It's also just a single HTML file. No sign-up, no server, no account to lose. Everything lives in your browser's local storage, which means it's fast, private, and yours.

## The timer itself

At its core it's a stopwatch (or a countdown, if you'd rather work backward from a fixed block of time). Nothing fancy, start, pause, reset, but a few things make it more useful than a plain timer:

- **Laps as study blocks.** Instead of one undifferentiated slab of time, you break a session into named chunks as you go — "chapter 5," "problem set," "review." Each one gets logged with its own duration.
- **Quick tag chips.** When you go to name a block, your most-used tags show up as one-tap buttons. This matters more than it sounds like, the whole stats system downstream depends on your tags being consistent, and typing "Physics" slightly differently five times in a row will quietly fragment your data. The chips are there to stop that from happening.
- **A pop-out timer.** Click the pop-out button and the clock detaches into its own small window (using Document Picture-in-Picture where the browser supports it, falling back to a regular popup otherwise), handy for keeping the timer visible while you work in another app.
- **Keyboard-first controls.** Space to start/pause, L to lap, R to reset, arrow keys to nudge the time, F for fullscreen, P to pop out, S for stats.

## Sessions, history, and the calendar

Every day you study gets bundled into a "session",  a running log of that day's blocks, viewable and editable later. You can:

- Browse past sessions in the sidebar, grouped by day.
- Open any day and see exactly what you worked on and for how long.
- Edit history after the fact, rename blocks, delete ones that don't belong, drag to reorder, or merge several blocks into one, in case you tagged something wrong or want to clean things up.
- Switch to the **calendar tab** for a day-by-day timeline view — literally seeing your study blocks laid out against the clock, with gaps (pauses) shown as empty space. The block that's currently running grows in real time and glows red at the edge so you can tell at a glance that it's live.

None of this needs the internet. It's all `localStorage` under the hood, sessions are kept for roughly the past year, so the longer-term stats actually have something to work with.

## The stats page

This is the part that turns "I studied today" into "here's what my studying actually looks like." Open it from the corner button or just hit `S`.

**At the top**, four numbers you can take in at a glance: total sessions logged, total time studied, your current streak, and your best single day ever.

**The activity heatmap** is a GitHub-style contribution graph, a year of little squares, darker or lighter depending on how much you studied that day. You can flip between "last 365 days" and specific calendar years, hover any square to see the date and time studied, and click one to jump straight into that day's full session detail. It's the fastest way to see the shape of a habit: are you consistent, or do you go quiet for a week and then cram?

**The study analysis panel** is where the tags earn their keep. It breaks down your time by subject/tag as a donut chart with percentages, plus a bar chart you can flip between Last 7 days, Weekly, Monthly, or Yearly views (with arrows to page backward and forward through history). This is the "am I actually splitting my time the way I think I am" check, it's very easy to *feel* like you're studying everything evenly and be wildly wrong about it.

**The daily goal bar**, back on the main timer screen, is the small nudge that ties it all together,  set a target number of minutes, and watch the bar fill in as you go. Combined with the streak counter sitting right above the clock, the idea is that awareness doesn't live in a separate dashboard you forget to check, it's part of the timer itself.

## Worth knowing

- Tags are grouped case-insensitively ("physics" and "Physics" count as the same tag), but not fuzzily, "Chem" and "Chemistry" will still be treated as two different tags. The quick tag chips are the main defense against this; there's no full tag-merging tool yet.
- Data lives entirely in your browser. Use **Data → Export backup** before clearing browser data or switching devices; there is no cloud sync.
- Around a year of history is kept before older entries start rolling off, which is enough for the yearly heatmap to actually mean something without the storage growing forever.
