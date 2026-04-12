# Meeting Minutes - 2 April 2026

**Platform:** Teams
**Date:** 02 April 2026
**Time:** 18:59

---

**Attendees:**

Yusra

Phelelani

Keanu

Mika

Shazmeen

---

## 1. Documentation & Workflow
 
- The team agreed to compile meeting minutes after each meeting and maintain them in a single document per sprint.
- The report should include:
  - Meeting minutes
  - User stories (in proper format)
  - Task assignments (who is doing what)
  - Progress status (e.g. in progress, testing, done)
- A template will be created and reused weekly.
- Retrospectives are required: both individual and group.

---

## 2. Project Management Approach
 
- The team will use **GitHub Projects** (Kanban board):
  - Tasks move from `To Do` → `In Progress` → `Done`
  - User stories will be created as issues
  - Tasks will be broken down and assigned to team members
- Work should be done on **separate branches**, not directly on `main`.
- Commits should clearly describe contributions.
 
---
 
## 3. System Design Overview
 
The project is a **campus food ordering web app** (proposed name: CampusBite or similar).
 
### User Roles & Features
 
| Role | Access |
|------|--------|
| **Guest** (not logged in) | View homepage and browse menu only |
| **User** (student/customer) | Login/register, dashboard, browse & filter menu, cart & checkout, order history, recommendations (possible ML bonus) |
| **Vendor** | Manage current orders, mark orders as collected/delivered, add menu items (possibly with image uploads) |
| **Admin** | Approve/suspend vendors, manage users/vendors, system operator |
 
---
 
## 4. Key Technical Decisions
 
- Use **Firebase** for authentication and database instead of building a backend from scratch.
- Consider using:
  - **Tailwind CSS** — styling without separate CSS files
  - **Icon libraries** — to avoid downloading assets manually
- Possibly integrate:
  - Payment system (to be researched)
  - Food/allergen API
 
---
 
## 5. Initial Features for First Sprint
 
Minimum requirements:
 
- Login/registration system
- Homepage
- Basic dashboards for each user role
 
---
 
## 6. Task Allocation (Initial)
 
| Member | Task |
|--------|------|
| **Yusra** | Login & registration |
| **Phelelani** | Homepage (index page) |
| **Others** | Assist with features, database, and UI as needed |
 
> Everyone contributes via GitHub issues and tasks.
 
---
 
## 7. Timeline & Meetings
 
- **Next meeting:** Monday (online)
- **Additional meeting:** Wednesday (in-person)
- Monday acts as a **checkpoint deadline** for initial features
 
---
 
## 8. Other Notes
 
- UI/design is **lower priority** — focus on functionality first
- Wireframes/mockups should be created to guide development
- Clarification needed from tutor on:
  - Preferred format for reports vs GitHub
  - Vendor features (e.g. image uploads)
