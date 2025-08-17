# Activity Timeline Dashboard

A modern, responsive React dashboard for visualizing and analyzing activity data with advanced filtering, time-series analysis, and comprehensive reporting features.

## 🚀 Features

### Core Functionality
- **Interactive Data Visualization**: Heatmap and bar chart views with smooth transitions
- **Advanced Filtering**: Multi-dimensional filtering by activity type, status, and date ranges
- **Custom Date Range Picker**: Flexible date selection with European format (DD.MM.YYYY)
- **Real-time Analytics**: Live data updates and trend analysis
- **Export Capabilities**: CSV and JSON export with filtered data
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices

### Date Range Features
- **Custom Date Selection**: Pick any date range (e.g., 01.01.2025 to 03.08.2026)
- **Quick Range Buttons**: Last 7 days, 30 days, 3 months, year presets
- **European Date Format**: DD.MM.YYYY display format for better accessibility
- **Range Validation**: Automatic validation and duration calculation
- **Smart Filtering**: Combines with other filters for precise data analysis

### Visualization Options
- **Multiple Granularities**: Hourly, daily, weekly, monthly, and yearly views
- **Interactive Elements**: Click-to-drill-down functionality
- **Status Color Coding**: Visual distinction between success, warning, and failure states
- **Gradient Intensity**: Data density visualization through color intensity
- **Accessibility Support**: High contrast mode and keyboard navigation

### Technical Capabilities
- **Performance Optimized**: Hardware acceleration and efficient rendering
- **Memory Efficient**: Smart data processing and component memoization
- **Cross-browser Compatible**: Works on all modern browsers
- **TypeScript Ready**: Easy migration path to TypeScript

## 🛠 Technology Stack

- **Frontend**: React 18 with Hooks and Context
- **Build Tool**: Vite for fast development and optimized builds
- **Visualization**: D3.js and Visx for charts and graphs
- **Date Handling**: date-fns for robust date manipulation
- **Styling**: Modern CSS with CSS Grid and Flexbox
- **Icons**: Lucide React for consistent iconography

## 📱 Responsive Design

The dashboard is fully responsive and adapts to different screen sizes:

- **Desktop** (1200px+): Full feature set with side-by-side layouts
- **Tablet** (768px - 1199px): Optimized grid layouts with touch-friendly controls
- **Mobile** (< 768px): Stacked layouts with collapsible menus and gesture support

### Mobile-Specific Features
- Touch-optimized date picker
- Swipe gestures for chart navigation
- Collapsible filter panels
- Optimized typography and spacing

## 🎯 Usage

### Getting Started
1. Hit the **Run** button to start the development server
2. The dashboard will open with sample data loaded
3. Explore different visualization modes and filters

### Date Range Selection
1. Click the **Calendar** icon in the filter toolbar
2. Choose from quick presets or set custom dates
3. Use format DD.MM.YYYY (e.g., 15.03.2025)
4. Apply the range to filter all data views

### Data Analysis
- Switch between **Heatmap** and **Bar Chart** views
- Adjust time granularity (hourly to yearly)
- Click on data points for detailed information
- Use filters to focus on specific activities or statuses

### Export and Sharing
- Export filtered data as CSV or JSON
- Generate reports with current filter settings
- Real-time collaboration features

## 🔧 Development

### Project Structure
```
src/
├── App.jsx          # Main application component
├── App.css          # Comprehensive styling
├── data.json        # Sample dataset
└── index.jsx        # Application entry point
```

### Key Components
- **HeatmapChart**: Interactive heatmap visualization
- **BarGraph**: Time-series bar chart with trends
- **DateRangePicker**: Custom date selection component
- **FilterPanel**: Advanced filtering interface
- **StatsDashboard**: Key metrics and KPIs

### Customization
- Modify `data.json` to use your own dataset
- Adjust color schemes in CSS variables
- Add new chart types by extending existing components
- Configure date formats and localization

## 📊 Data Format

The dashboard expects data in the following JSON format:
```json
[
  {
    "activityType": "Login",
    "status": "success",
    "user": "user_123",
    "device": "device_A",
    "date": "2025-01-15",
    "timestamp": "2025-01-15T10:30:00Z"
  }
]
```

### Supported Fields
- **activityType**: Category of activity
- **status**: success, warning, or fail
- **user**: User identifier
- **device**: Device identifier
- **date**: ISO date string (YYYY-MM-DD)
- **timestamp**: Full ISO timestamp

## 🚀 Deployment

By default, Replit runs the `dev` script for development. For production:

1. Run `npm run build` to create optimized build
2. Deploy the `dist` folder to your hosting platform
3. Configure environment variables as needed

For Replit deployment, the build is automatically optimized for production when published.

## 📈 Performance

- **Optimized Rendering**: Uses React.memo and useMemo for efficiency
- **Lazy Loading**: Components load on demand
- **Data Virtualization**: Handles large datasets efficiently
- **Hardware Acceleration**: CSS transforms for smooth animations

## 🎨 Customization

### Themes
Modify CSS variables to change the overall appearance:
```css
:root {
  --primary-color: #3b82f6;
  --success-color: #22c55e;
  --warning-color: #eab308;
  --error-color: #ef4444;
}
```

### Date Formats
Change date display formats in the date utility functions:
```javascript
// European format: DD.MM.YYYY
format(date, 'dd.MM.yyyy')

// US format: MM/DD/YYYY
format(date, 'MM/dd/yyyy')
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on different devices
5. Submit a pull request with detailed description

## 📝 License

This project is open source and available under the MIT License.

---

Built with ❤️ using React and Vite for optimal performance and developer experience.