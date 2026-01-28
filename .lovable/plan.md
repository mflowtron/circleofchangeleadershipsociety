
# Circle of Change Learning Management System

A modern, feature-rich learning platform inspired by Google Classroom, tailored for the Circle of Change Leadership Society.

---

## Design & Branding
- **Modern & bold** visual design using the gold and black color scheme from your logo
- Your Circle of Change logo prominently displayed in the navigation
- Clean, content-focused layouts with rich visual elements
- Responsive design for desktop and mobile access

---

## Core Features

### 1. Authentication & User Profiles
- Secure login/signup system
- Profile pages with name, photo, role, and chapter assignment
- Role-based access: Admin, Advisor, and Student

### 2. Chronological Feed (Main Hub)
- Central dashboard showing posts in reverse chronological order
- Create posts with text, photos, videos, and links
- Share to **entire group** or **your chapter only**
- Like and comment on posts
- Filter options: All posts, Chapter only, My posts

### 3. Lecture Recordings Library
- Dedicated page to browse past learning lectures
- Organized by date or topic
- Video playback with descriptions
- Admins and Advisors can upload new recordings

---

## Role-Based Navigation & Permissions

### Students
- **Feed** - View, create posts, comment, and interact
- **Recordings** - Access lecture video library
- **Profile** - View and edit their own profile

### Advisors
- Everything students have, plus:
- **My Chapter** - View and moderate their assigned chapter's content
- **Moderate** - Approve, edit, or delete posts in their chapter

### Admins
- Full access to all features, plus:
- **User Management** - Add, edit, remove users; assign roles
- **Chapter Management** - Create/edit chapters (cohorts); assign users
- **Content Moderation** - Moderate any post across all chapters
- **Upload Recordings** - Add new lecture videos to the library

---

## Chapter System
- Chapters represent cohorts/class years
- Users are assigned to one chapter
- Posts can be scoped to a specific chapter
- Advisors are assigned to specific chapters they oversee

---

## Technical Implementation
- **Lovable Cloud** for authentication, database, and file storage
- Secure role-based permissions (roles stored in a separate table for security)
- File uploads for profile photos, post images/videos, and lecture recordings
