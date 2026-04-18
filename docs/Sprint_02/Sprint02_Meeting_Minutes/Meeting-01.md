# Sprint 2 
# Meeting One Minutes 

**Platform:** In person  
**Date:** *16-04-2026*  
**Time:** *9:40am*  

---

## Attendees

- Yusra  (virtually)
- Phelelani  
- Keanu  
- Mika  
- Shazmeen  

---

## Discussion Points

### 1. Pull Requests & Workflow

- PRs must be reviewed and closed quickly (±5 hours after opening)
- Delays in PR reviews can lead to:
  - Duplicate work
  - Merge conflicts
- Team members should check existing PRs before starting new work
- Suggested workflow:
  - Pull branch locally and test before approving
  - Use `git checkout` to test branches
  - Use `git stash` to avoid losing work

---

### 2. Testing & Code Coverage

- Target code coverage: **60–80%**
- Code should be written as **exportable functions** to allow testing
- Test files should be added alongside feature development
- Team members can contribute tests within active PRs

---

### 3. Documentation

- Documentation needs restructuring and improvement
- Required structure:
  - Meetings
  - Sprint documents (planning, review, retrospective)
  - User stories
- Documentation must be:
  - Clearly structured
  - Continuously updated
- Deadline set for completion (Friday/Sunday)

---

### 4. Core Feature Focus (Sprint 2)

- Primary focus: **customer order placement**
- Proposed implementation:
  - Add checkout button to menu items
  - If user is not logged in → prompt login
  - Orders should be stored and linked to vendors
- Vendors should:
  - View incoming orders
  - Update order status (e.g. ready for collection)

---

### 5. System Design Considerations

- Handling multiple vendors per order:
  - May require splitting orders per vendor
  - Payment handling still unclear (to be confirmed)
- Menu items should include:
  - Shop name
  - Possibly shop location

---

### 6. GitHub Project Usage

- Proper use of board statuses required:
  - In Progress
  - Done
  - Need Help
- Before starting work:
  - Check if task is already assigned/in progress
- New user stories/issues should be created when needed

---

### 7. Bugs & Fixes Identified

- Logout functionality not working due to missing ID on some pages
- Fix required across all affected pages

---

### 8. Additional Work

- UML diagrams need to be created (multiple types)
- Documentation and code coverage are top priorities
- Sprint 2 will require a new release (**version 2.0**)

---

### 9. Meetings & Coordination

- Need for more frequent meetings (daily scrums)
- PR reviews may be conducted during meetings
- Next meeting scheduled for **18:00**

---

## Decisions Made

| Decision | Detail |
|----------|--------|
| PR workflow | Review and close within short timeframe |
| Testing | Target 60–80% coverage |
| Documentation | Restructure and maintain properly |
| Sprint focus | Order placement and vendor interaction |
| Meetings | Increase frequency |

---

## Next Steps

- [ ] Implement customer order placement
- [ ] Enable vendor order management
- [ ] Improve code coverage
- [ ] Restructure documentation
- [ ] Fix logout issue
- [ ] Create UML diagrams
- [ ] Prepare Sprint 2 release

---

## Key Takeaway

Sprint 2 focuses on transitioning from basic system setup to full interaction between customers and vendors, while improving workflow, testing, and documentation.
