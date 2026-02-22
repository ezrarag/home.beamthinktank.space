# BEAM Think Tank Homepage

A minimalist landing page for BEAM that detects visitor location, deduces their role, and provides personalized NGO recommendations.

## 🎯 Features

- **Location Detection**: Uses Geolocation API with IP fallback
- **Role Deduction**: Automatically determines if visitor is near a university (Student) or Community Member
- **Smooth Animations**: Framer Motion powered transitions between steps
- **Persistent State**: localStorage caching for returning visitors
- **Accessibility**: Full keyboard navigation and ARIA labels
- **Responsive Design**: Clean, modern UI with Tailwind CSS

## 🚀 Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Architecture

### Components

- **`LocationDetector.tsx`**: Handles geolocation and university proximity detection
- **`RoleSelector.tsx`**: Dropdown for role selection (Student/Community Member)
- **`InterestSelector.tsx`**: Interest area selection (Education, Finance, Music, etc.)
- **`QuickStartCard.tsx`**: Personalized NGO recommendations and CTAs

### State Management

- **`userStore.ts`**: Zustand store with persistence for user choices
- Handles location data, role selection, and flow state
- Automatically saves to localStorage

### User Flow

1. **Location Detection**: Automatically detects visitor location
2. **Role Selection**: Preselects role based on university proximity
3. **Interest Selection**: Choose from 5 NGO categories
4. **Personalized Experience**: Shows relevant NGO and CTA
5. **Returning Visitors**: Skips to personalized experience

## 🎨 Design System

- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS with custom gradients
- **Animations**: Framer Motion for smooth transitions
- **Icons**: Emoji-based for simplicity and accessibility
- **Typography**: Clean, readable font stack with Geist fonts

## 🔧 Configuration

### Website Directory Admin

- Admin page: `/admin/website-directory`
- Firestore collection: `beamWebsiteDirectory`
- Public merged API (internal + readyaimgo): `/api/website-directory`
- Public internal-only API: `/api/website-directory/internal`
- Rules require custom claim `admin: true` for create/update/delete
- Docs: `docs/WEBSITE_DIRECTORY_ADMIN.md`

### University Detection

Edit `LocationDetector.tsx` to add more universities:

```typescript
const UNIVERSITIES = [
  { name: 'Your University', lat: 0.0000, lng: 0.0000 },
  // ... more universities
];
```

### NGO Data

Modify `QuickStartCard.tsx` to update NGO information:

```typescript
const NGO_DATA = {
  education: {
    title: 'Your NGO',
    description: 'Description...',
    // ... more data
  }
};
```

## 📱 Browser Support

- Modern browsers with Geolocation API support
- Graceful fallback to IP-based location detection
- Responsive design for mobile and desktop

## 🚀 Deployment

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Deploy to your preferred platform:**
   - Vercel (recommended)
   - Netlify
   - AWS Amplify
   - Any static hosting service

## 🔮 Future Enhancements

- Real IP geolocation API integration
- More detailed university database
- User accounts and profiles
- Advanced matching algorithms
- Analytics and tracking
- Multi-language support

## 📄 License

MIT License - feel free to use this project as a starting point for your own NGO platform.
