# Meeting Minutes — 6 April 2026
 
**Platform:** WhatsApp
**Date:** 6 April 2026
**Time:** 13:00
 
---
**Attendees:**

Yusra

Keanu

Mika

Shazmeen

---
## Discussion Points
 
### 1. Login Page & Roles
 
- **Admin** is not a selectable role during registration
- Admin users will be **manually added** to the database
- Clients (customers) are not admins
- System can support one or multiple admins
 
### 2. Frontend Structure
 
- Decided to use **external files** instead of inline code
- This allows editing of individual components separately and improves maintainability
 
### 3. User Stories
 
- Implement login and sign-up functionality
- Each user has a **role-based homepage**:
  - Student/Customer dashboard
  - Vendor dashboard
- Users must select a role during sign-up
- **Vendors** can:
  - Post and manage menu items
- **Customers** can:
  - Browse available menus
- Menu system should include:
  - Item availability (e.g. "sold out" indicator)
 
### 4. Documentation Requirements
 
- Maintain meeting minutes for all discussions
- Create and bundle user stories (Markdown or text file)
- Conduct **sprint reviews**:
  - Each member explains their work and decisions
- Include **retrospectives** for each sprint (as per tutor requirements)
 
### 5. Presentation Plan
 
- Demonstrate implemented features (e.g. homepage)
- Show both:
  - **UI** — what the user sees
  - **Code** — how it was implemented
 
---
 
## Decisions Made
 
| Decision | Detail |
|----------|--------|
| Role-based access | Customer, Vendor, Admin |
| Admin registration | Will not register via UI — added manually to database |
| File structure | Use external JavaScript/CSS files |
| Menu system | Implement vendor menu with availability status |
 
---
 
## Next Steps
 
- [ ] Create user stories and GitHub issues
- [ ] Begin homepage implementation
- [ ] Set up Jest and CI testing
- [ ] Start vendor menu feature
 
---
 
## Evidence
![Meeting screenshot](../../assets/meeting_screenshot.jpeg)
