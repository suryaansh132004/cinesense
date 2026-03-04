# CineSense

An AI-powered movie review sentiment analyzer that provides intelligent insights into movie reviews using Google's Gemini AI.

🔗 **Live Demo**: [https://cinesense132004.netlify.app](https://cinesense132004.netlify.app)

## Features

- 🔍 Search movies by name or IMDb ID
- 🎬 Browse trending movies and TV shows with filters (genre, year)
- 🤖 AI-powered sentiment analysis of reviews using Gemini 2.5 Flash
- 🎭 View cast/crew details and filmography
- 💡 Google-style autocomplete search suggestions
- 🌓 Light/Dark mode support
- 📱 Fully responsive design

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- TMDB API key ([Get one here](https://www.themoviedb.org/settings/api))
- Google Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/suryaansh132004/cinesense.git
cd cinesense
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create a `.env.local` file in the root directory:
```env
TMDB_API_KEY=your_tmdb_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

4. **Run the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Build for production**
```bash
npm run build
npm start
```

## Tech Stack Rationale

### Frontend
- **Next.js 16 (App Router)**: Chosen for server-side rendering, API routes, and optimal performance. App Router provides better data fetching patterns and streaming capabilities.
- **TypeScript**: Ensures type safety and better developer experience with autocomplete and error detection.
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development with consistent design system.
- **Framer Motion**: Smooth animations and transitions for enhanced user experience.
- **next-themes**: Seamless dark/light mode implementation with system preference detection.

### Backend/APIs
- **TMDB API**: Comprehensive movie database with extensive metadata, cast/crew info, and reviews. Free tier supports development needs.
- **Google Gemini 2.5 Flash**: Latest AI model for fast, accurate sentiment analysis. Chosen for:
  - High token limits (3000 output tokens)
  - JSON mode support for structured responses
  - Cost-effective compared to alternatives
  - Fast response times suitable for real-time analysis

### Deployment
- **Netlify**: Serverless deployment with automatic builds, environment variable management, and global CDN. Supports Next.js API routes as serverless functions.

## Assumptions

1. **API Rate Limits**: Assumes TMDB and Gemini API free tier limits are sufficient for typical usage. Implements error handling for quota exceeded scenarios.

2. **Sentiment Analysis**: 
   - Primary sentiment is determined by TMDB rating (≥7 = positive, 5-6.9 = mixed, <5 = negative)
   - AI sentiment analysis provides additional context but doesn't override rating-based sentiment
   - Reviews are analyzed in batches to stay within token limits

3. **Data Availability**: Assumes TMDB data is accurate and up-to-date. Some movies may have limited review data.

4. **Browser Compatibility**: Optimized for modern browsers (Chrome, Firefox, Safari, Edge) with ES6+ support.

5. **Network Conditions**: Assumes stable internet connection. Implements loading states but doesn't include offline functionality.

6. **User Input**: Assumes users will search for existing movies/TV shows. Invalid IMDb IDs or non-existent titles show appropriate error messages.

7. **Image Assets**: Relies on TMDB CDN for poster images. Fallback UI shown when images are unavailable.

8. **API Keys Security**: Environment variables are used for API keys and not committed to version control. Users must provide their own keys for local development.

## Project Structure

```
cinesense/
├── app/
│   ├── api/              # API routes (movie, search, trending, person, discover)
│   ├── page.tsx          # Main application component
│   └── globals.css       # Global styles and theme variables
├── components/
│   └── ThemeToggle.tsx   # Dark/light mode toggle
├── lib/
│   └── gemini.ts         # Gemini AI integration
└── .env.local            # Environment variables (not in repo)
```

## License

MIT
