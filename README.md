# FIS Inscriptions Web Application

[![CI](https://github.com/mlfcnt/fis-inscriptions-web/workflows/CI/badge.svg)](https://github.com/mlfcnt/fis-inscriptions-web/actions)
[![Coverage Status](https://coveralls.io/repos/github/mlfcnt/fis-inscriptions-web/badge.svg?branch=main)](https://coveralls.io/github/mlfcnt/fis-inscriptions-web?branch=main)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://reactjs.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A comprehensive digital platform for managing French alpine ski team registrations for international FIS competitions. This application streamlines the complex process of submitting official team entries to competition organizers worldwide while ensuring full compliance with FIS regulations.

## 🎯 Business Overview

### What It Does

The FIS Inscriptions Web Application automates and manages the registration process for French ski teams competing in international FIS (International Ski Federation) alpine skiing competitions abroad. It serves as the official digital gateway between the French Ski Federation (FFS) and international competition organizers.

### Key Business Value

- **Operational Efficiency**: Reduces manual paperwork and eliminates data entry errors through automation
- **Professional Representation**: Generates official, branded documentation for international correspondence
- **Real-time Data**: Integrates with live FIS APIs for current competition data and competitor rankings

### Target Users

- **French Ski Federation Staff**: Team managers and competition coordinators
- **Competition Administrators**: Handle final submissions and communications
- **Support Personnel**: Coaches and staff included in team delegations

## 🏗️ Technical Architecture

### Modern Full-Stack Implementation

Built with cutting-edge technologies to ensure reliability, performance, and maintainability:

**Frontend**

- **Next.js 15** with App Router for modern React architecture
- **React 19** with server components for optimal performance
- **TypeScript** for type safety and developer experience
- **Tailwind CSS** + **Radix UI** for professional, accessible design
- **Progressive Web App (PWA)** with offline capabilities

**Backend & APIs**

- **Next.js API Routes** for serverless backend functionality
- **FIS Official API Integration** for real-time competition data
- **Drizzle ORM** with **PostgreSQL** for robust data management
- **Zod** for runtime type validation and data parsing

**Key Features Implementation**

- **Authentication**: Clerk integration for secure user management
- **PDF Generation**: Server-side document creation with official branding
- **Email Automation**: Resend integration for professional correspondence
- **Real-time Search**: Optimized competitor lookup with debounced queries
- **Offline Support**: PWA capabilities for reliable mobile usage

### Advanced Technical Features

#### Database Design

- **Soft Delete Implementation**: Maintains data integrity while allowing logical deletion
- **Relational Data Model**: Complex relationships between competitions, competitors, and coaches
- **Migration System**: Drizzle-based schema versioning for reliable deployments
- **Query Optimization**: Efficient data retrieval for large competitor datasets

#### API Architecture

- **RESTful Design**: Clean, predictable API endpoints
- **External Integrations**: Seamless FIS API communication with error handling
- **Data Validation**: Multi-layer validation (client-side, API-level, database constraints)
- **Error Handling**: Comprehensive error management with user-friendly messages

#### Advanced UI/UX

- **Server Components**: Optimal performance with minimal client-side JavaScript
- **Responsive Design**: Mobile-first approach with desktop optimization
- **Accessibility**: WCAG compliant with screen reader support
- **Real-time Updates**: Live data synchronization without page refreshes

## 🚀 Key Technical Implementations

### Complex Data Management

```typescript
// Sophisticated competitor search with FIS points integration
const competitors = await db.query.competitors.findMany({
  where: and(
    eq(competitors.nationality, "FRA"),
    or(
      ilike(competitors.firstname, `%${search}%`),
      ilike(competitors.lastname, `%${search}%`)
    )
  ),
  with: {
    fisPoints: true, // Current rankings across all disciplines
  },
});
```

### Professional Document Generation

- **PDF Generation**: Server-side rendering of official FIS entry forms
- **Email Templates**: Automated professional correspondence in English/French
- **Digital Signatures**: Integration of official federation signatures and seals
- **Multi-format Export**: Support for various document formats as required

### Performance Optimizations

- **React Query**: Advanced caching and synchronization
- **Server-Side Rendering**: Optimal SEO and initial load performance
- **Code Splitting**: Lazy loading for improved bundle size
- **Database Indexing**: Optimized queries for large datasets

## 🧪 Quality Assurance

### Comprehensive Testing Strategy

- **Unit Tests**: Critical business logic validation
- **Integration Tests**: API endpoint functionality verification
- **Component Testing**: UI component reliability
- **Database Testing**: Data integrity and migration testing

### Development Standards

- **TypeScript Strict Mode**: Maximum type safety
- **ESLint Configuration**: Code quality enforcement
- **CI Pipeline**: Automated testing and linting
- **CI/CD Pipeline**: Automated testing and deployment

## 📊 Technical Metrics

- **Type Coverage**: 100% TypeScript implementation
- **Test Coverage**: Comprehensive test suite across all layers
- **Performance**: Optimized for sub-second page loads
- **Accessibility**: WCAG 2.1 AA compliance
- **Browser Support**: Modern browsers with progressive enhancement

## 🛠️ Development & Deployment

### Quick Start

```bash
# Install dependencies
bun install

# Setup environment
cp .env.example .env.local

# Run development server
bun dev

# Run tests
bun run test

# Build for production
bun run build
```

### Key Dependencies

- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Clerk
- **Styling**: Tailwind CSS + Radix UI
- **Forms**: React Hook Form + Zod validation
- **State Management**: TanStack Query
- **Testing**: Vitest + Testing Library

## 🔗 External Integrations

### FIS Official API

- Real-time competition data synchronization
- Competitor ranking and points retrieval
- Competition validation and eligibility checking

### Email & Communication

- Professional email templates for international correspondence
- Automated submission confirmations
- Deadline reminder notifications

## 📈 Business Impact

This application demonstrates expertise in:

- **Complex Domain Modeling**: Sports federation regulations and workflows
- **API Integration**: Real-time data synchronization with external systems
- **Document Generation**: Professional PDF creation with official branding
- **User Experience**: Intuitive interfaces for complex administrative tasks
- **Performance Optimization**: Fast, reliable operation under varying loads
- **Quality Assurance**: Comprehensive testing for mission-critical functionality

---

**Technologies**: Next.js 15, React 19, TypeScript, PostgreSQL, Drizzle ORM, Tailwind CSS, Clerk Auth, FIS API Integration

**Architecture**: Full-stack web application with PWA capabilities, serverless backend, and real-time data synchronization
