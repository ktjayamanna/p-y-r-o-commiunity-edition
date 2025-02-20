# 🔥 P-y-r-o Community Edition

**P-y-r-o Community Edition** is striving to be a fully self-hosted, open-source edition of our enterprise ad tech platform Pyro by Firebay Studios.

> **🚀 Need the Enterprise Cloud Version?**  
> Visit our [Enterprise Cloud Version](https://project-isildor.vercel.app/) for a managed solution with premium features.  
> Contact: [kjayamanna@firebaystudios.com](mailto:kjayamanna@firebaystudios.com) if you'd like to explore the Enterprise Cloud Version for free for 7 days.

## 📖 Current State

We launched the community edition of our product to empower solopreneurs to create their own radio ads for free as a standalone solution. At present, the platform relies on hosted services such as AWS, Firebase, and ElevenLabs. However, our goal is to evolve it into a fully self-sustained, offline-capable platform.

We welcome contributors who share this vision! If you're interested in helping us achieve this milestone, we’d love to see your pull requests (PRs). 🚀

## ⚖️ License

This project is available under an **open-source, non-commercial license**. You may read, modify, and contribute to the code.  

**⚠️ Commercial use is not permitted.**  

## 🚀 Getting Started
Since the current state of the project is cloud based, you'd need to set up the cloud services to get the product up and running on your local computer. If you need any help with setting up the cloud infrastructure, please reach out to [kjayamanna@firebaystudios.com](mailto:kjayamanna@firebaystudios.com)

### 🖥️ Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Create environment configuration:**
   Create a `.env.local` file with these variables:
   ```env
   # Firebase variables (obtain from Firebase Console > Project Settings > Your Apps)
   NEXT_PUBLIC_FIREBASE_API_KEY=
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
   NEXT_PUBLIC_FIREBASE_APP_ID=
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

   # Stripe keys (available in Stripe Dashboard > Developers > API keys)
   STRIPE_RESTRICTED_SECRET_KEY=

   # PostHog analytics (from PostHog dashboard settings)
   NEXT_PUBLIC_POSTHOG_KEY=
   NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

   # ElevenLabs API key (available in your ElevenLabs account dashboard)
   ELEVEN_LABS_API_KEY=
   
   # AWS credentials (create in AWS IAM Console with appropriate permissions)
   MIN_PYRO_USER_AWS_ACCESS_KEY=
   MIN_PYRO_USER_AWS_SECRET_KEY=
   ```

3. **Install and run:**
   ```bash
   npm install
   npm run dev
   ```

### 🔧 Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Configure environment:**
   Create a `.env` file in the `.devcontainer` folder:
```env
   # Get from your ElevenLabs account dashboard
   ELEVENLABS_API_KEY=
   
   # Base64-encoded JSON from Firebase console > Project settings > Service accounts
   FIREBASE_SERVICE_KEY=
   
   # Authentication key for music update service
   FIREBAY_MUSIC_UPDATE_KEY=
   
   # Create in AWS IAM Console with appropriate S3/storage permissions
   MIN_PYRO_USER_AWS_ACCESS_KEY=
   MIN_PYRO_USER_AWS_SECRET_KEY=
   
   # Message broker URL (SQS broker URL for message queue)
   BROKER_URL=
   
   # AWS SQS queue URL (from AWS SQS Console)
   SQS_URL=
   
   # S3 bucket links for music assets
   BACKGROUND_MUSIC_URL=
   MUSIC_PREVIEW_URL=
   ```
   Note: `FIREBASE_SERVICE_KEY` must be a Base64-encoded JSON string of your Firebase credentials.


3. **Build environment:**
   ```bash
   bash_scripts/docker/project_based_cleanup_and_rebuild.sh
   ```

## 🤝 Contributing

We welcome community contributions:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes with clear messages
4. Submit a pull request detailing your improvements

## 📬 Contact

Questions or feedback? Reach out to:  
[kjayamanna@firebaystudios.com](mailto:kjayamanna@firebaystudios.com)# p-y-r-o-commiunity-edition
