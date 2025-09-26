# Gestionnaire de Paiements Immobiliers

## Overview

This is a French real estate payment management system built as a single-page web application. The system allows users to manage members, track payments for real estate lots (villa, apartments, land), and view financial summaries. The application is designed for real estate agencies or property management companies operating in French-speaking regions, using FCFA currency.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Technology**: Vanilla JavaScript with HTML5 and CSS3
- **Architecture Pattern**: Single-page application (SPA) with tab-based navigation
- **State Management**: Class-based JavaScript (`PaymentManager`) with localStorage persistence
- **UI Framework**: Custom CSS with modern design system using CSS variables and responsive layouts
- **Design System**: Uses Inter font family with iOS-inspired design patterns and gradient backgrounds

### Data Storage
- **Primary Storage**: Browser localStorage for client-side persistence
- **Data Structure**: JSON-based storage for three main entities: members, payment records, and lots
- **Persistence**: Automatic saving to localStorage on all data operations
- **No Backend**: Entirely client-side application with no server dependencies

### Application Structure
- **Main Controller**: `PaymentManager` class handles all application logic and state management
- **UI Management**: Tab-based interface with modal overlays for forms
- **Navigation**: Monthly navigation system for viewing payment history by time period

## Key Components

### Core Application Class
- **PaymentManager**: Main application controller that manages:
  - State initialization and persistence with localStorage
  - Event handling for all UI interactions
  - Data operations (CRUD for members, payments, and lots)
  - UI updates and statistics calculations
  - Monthly navigation and filtering

### Data Models
- **Members**: People participating in the payment system with selected lots and payment duration
- **Payments**: Transaction records with member associations, amounts, and dates
- **Lots**: Real estate properties available for purchase including:
  - Villas (e.g., "Villa Moderne A" - 25M FCFA)
  - Apartments (e.g., "Appartement Standing B" - 15M FCFA)
  - Land/Terrain (e.g., "Terrain Constructible C" - 8M FCFA)

### UI Components
- **Dashboard**: Overview with monthly summary and statistics in French
- **Header Statistics**: Real-time display of total members and monthly payments in FCFA
- **Monthly Navigation**: Previous/next month buttons for viewing historical data
- **Forms**: Modal-based forms for adding/editing members and recording payments

## Data Flow

1. **Initialization**: Application loads data from localStorage on startup
2. **Default Data**: If no lots exist, loads predefined real estate properties
3. **User Interactions**: All actions trigger PaymentManager methods
4. **State Updates**: Data modifications update both memory and localStorage
5. **UI Refresh**: Statistics and displays update automatically after data changes
6. **Monthly Filtering**: Data can be filtered by month/year for historical viewing

## External Dependencies

- **Google Fonts**: Inter font family for typography
- **No External Libraries**: Pure vanilla JavaScript implementation
- **No API Dependencies**: Fully client-side with no server communication
- **Browser Storage**: Relies on localStorage for data persistence

## Deployment Strategy

- **Static Hosting**: Can be deployed on any static hosting service (Netlify, Vercel, GitHub Pages)
- **No Build Process**: Direct deployment of HTML, CSS, and JavaScript files
- **No Server Requirements**: Pure client-side application
- **Browser Compatibility**: Modern browsers with localStorage support required

The application follows a simple but effective architecture for managing real estate payments, with French localization and FCFA currency formatting throughout. The design emphasizes user experience with smooth transitions and an intuitive interface for property management professionals.