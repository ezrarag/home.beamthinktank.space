# BEAM Landing Page - TODO

## ✅ Completed (Stage 1 & 2)

### Stage 1: Landing Page
- [x] Full-screen dark layout with centered chat-style input
- [x] Animated placeholder text cycling through examples
- [x] Live keyword matching with video panel slide-down
- [x] Enter key locks selection with checkmark indicator
- [x] Reset button functionality
- [x] Color scheme: background #141414, chat #1D2127, outline #23262B, accent #89C0D0
- [x] Transparent header with #77859D text color
- [x] Fixed viewport height, no scrolling

### Stage 2: Role Classification & Auth
- [x] Firebase Auth setup with Google sign-in
- [x] Role classification: university proximity + keyword heuristics
- [x] Keyword aliases for flexible matching (engineer → engineering, etc.)
- [x] CTA routing to correct dashboard after video lock
- [x] Top navigation with Home/Dashboard/Logout
- [x] Participant and Community dashboard skeletons
- [x] Auth state persistence with Zustand

### Video System
- [x] Video mapping for: construction, engineering, music, orchestra, chorus, medicine, architecture, support
- [x] Interactive hover overlays showing:
  - Top-left: User's city/state
  - Bottom-right: Nearby universities (dummy data)
  - Bottom-left: Average pay rate by field
- [x] Smooth Framer Motion animations for overlays

## 🔧 Current Issues
- [x] **Engineering video not playing** - Fixed with working URL and debugging
- [x] **Dashboard redirect not working** - Fixed: removed auth dependency, added fallback

## 📋 Next Steps (Priority Order)

### Immediate Fixes
1. **Test dashboard redirects** - Verify CTA buttons work correctly
2. **Add proper engineering video** - Replace temporary construction video
3. **Test all video URLs** - Ensure all videos load and play correctly

### Stage 3: Enhanced Features
4. **Real university data** - Replace dummy universities with actual nearby institutions
5. **Real pay rate data** - Connect to actual salary data APIs
6. **Video optimization** - Add loading states, error fallbacks, preloading
7. **Mobile responsiveness** - Ensure overlays work well on mobile

### Stage 4: Backend Integration
8. **Firebase configuration** - Set up real Firebase project with proper env vars
9. **User profiles** - Store user preferences and location data
10. **NGO data integration** - Connect to real NGO databases
11. **Payment processing** - Integrate Stripe or similar for subscriptions

### Stage 5: Advanced Features
12. **Analytics** - Track user interactions and video engagement
13. **A/B testing** - Test different video/content combinations
14. **Personalization** - Customize experience based on user history
15. **Social features** - Share videos, connect with other users

## 🎯 Current Focus
**Fix engineering video playback issue** - This is blocking the core functionality.

## 📝 Notes
- All Firebase calls are currently stubbed with safe fallbacks
- Video URLs point to Firebase Storage (may need authentication)
- Role classification works but could be enhanced with ML
- Dashboard pages are basic skeletons ready for content
