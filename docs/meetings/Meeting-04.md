# Meeting Minutes - 11 April 2026

**Platform:** Teams  
**Date:** 11 April 2026  
**Time:** 12:57  

---
**Attendees:**

Yusra

Phelelani

Keanu

Mika

---
## 1. Testing & Code Coverage

- The team discussed code coverage and testing setup.
- Jest (with Babel) is being used for testing.
- Since Firebase functions are built-in, they cannot always be tested directly.
- A workaround is to create separate functions that can be imported and tested.
- A `test` folder has been created to store test scripts.
- The `coverage` folder is auto-generated and does not need to be edited manually.
- Testing is not the main priority for Sprint 1, but the setup should be ready for later.

---

## 2. Repository Setup

- `node_modules` was discussed and explained as dependency files created after npm setup.
- These files were added as part of the testing setup.
- The team noted that `node_modules` should likely not remain in the repository and this will be checked later.
- Team members can run tests locally using the configured npm test command.

---

## 3. Deployment

- Different hosting options were discussed:
  - GitHub Pages
  - Netlify
  - Firebase Hosting
  - Azure
- Since the project currently uses a simple frontend and Firebase backend, easier hosting options were preferred.
- The team agreed to use **GitHub Pages for now**.
- Netlify may also be tested as an alternative later.
- Azure can be considered later if the stack becomes more complex.

---

## 4. GitHub Workflow

- A GitHub organisation was created so that all members can access the project board.
- The team will continue using the GitHub Projects board to track work.
- Issues and pull requests should continue to be linked to project progress.
- The current pull request workflow was discussed and the team agreed that their approach is acceptable.

---

## 5. Feature Progress

### Vendor Features
- A vendor menu management page has been created.
- Vendors can:
  - Add menu items
  - Enter item details such as name, description, price, dietary and allergen information
  - Upload item images
  - Mark items as available or sold out
- Sold out items will no longer appear on the browse page.

### Browse Page
- The browse page is being populated dynamically with available menu items.
- Dietary and allergen information is also displayed.
- Filtering functionality has been worked on and is in progress.
- Potential merge conflicts were noted, so team members must pull the latest changes before continuing work.

### Registration Updates
- Vendor registration was updated.
- If a user selects the vendor role, a shop name field is shown.
- New vendors are now required to enter a shop name during registration.

---

## 6. Firebase Integration

- Firebase is being used for:
  - Authentication
  - Firestore database
  - Storage for images
- Current data includes:
  - Users
  - Menu items
  - Uploaded images in storage

---

## 7. Documentation

- Documentation is required for Monday.
- The document should combine:
  - User stories
  - Acceptance criteria
  - Closed issues
- Phelelani will compile the documentation into one file and post it on Teams for review.
- A documentation channel has already been created on Teams.
- Previous meeting summaries have already been uploaded there.

---

## 8. Sprint 1 Readiness

- The team agreed that most Sprint 1 work is already complete.
- Minimum requirements for Monday remain:
  - Login
  - Registration
  - Separate dashboards
- Remaining fixes include:
  - Final login issues
  - Forgot password functionality
  - Small clean-up tasks
- The team agreed not to show every feature during the presentation.
- The demo should stay focused on the core Sprint 1 requirements.

---

## 9. Admin Role Discussion

- Admin functionality still needs to be added.
- The agreed approach is to start with one manually-added admin account.
- More advanced admin management can be added later.

### Possible Admin Features
- Approve or suspend vendors
- Monitor system functionality
- View analytics such as sales and popular items

---

## 10. Future Work

- Features planned for later include:
  - Customer ordering
  - Order tracking
  - Order history
  - Customer recommendations
  - Profile management
  - Vendor analytics
- The team noted that these depend on first completing the basic ordering flow.
- UML diagrams were also mentioned as a requirement for the next sprint.

---

## 11. Task Allocation

| Member | Task |
|--------|------|
| **Yusra** | Finish login issues and start admin setup |
| **Phelelani** | Compile documentation and create admin issue |
| **Keanu** | Check deployment using GitHub Pages / Netlify |
| **Mika** | Continue browse page work after resolving pull request conflicts |

---

## 12. Presentation Planning

- The team discussed presentation timing for Monday.
- An earlier session was preferred, with **14:15** suggested as the preferred slot.
- Each member should be prepared to explain the code they personally worked on.
- The team agreed that members are most likely to be questioned on their own contributions rather than unrelated code.

---

## 13. Other Notes

- Functionality remains the priority over extra polish.
- Team members should be ready to explain why certain functions and implementation choices were used.
- The project has progressed well, so the focus is now on polishing, documenting, and preparing for the checkpoint.

---

## 14. Next Steps

- Review and approve outstanding pull requests
- Finalise documentation
- Complete admin setup
- Prepare for Monday’s presentation
- Continue with ordering-related features in the next sprint
