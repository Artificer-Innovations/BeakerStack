#!/bin/bash

# Setup Local Development Environment
# This script sets up the local development environment for the Beaker Stack

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_status "Checking prerequisites..."

# Check Node.js
if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi
print_success "Node.js $(node -v) is installed"

# Check npm
if ! command_exists npm; then
    print_error "npm is not installed. Please install npm."
    exit 1
fi
print_success "npm $(npm -v) is installed"

# Check Docker
if ! command_exists docker; then
    print_error "Docker is not installed. Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
    exit 1
fi

if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker Desktop."
    exit 1
fi
print_success "Docker is installed and running"

# Check Supabase CLI
if ! command_exists supabase; then
    print_warning "Supabase CLI is not installed. Installing globally..."
    npm install -g supabase
    print_success "Supabase CLI installed"
else
    print_success "Supabase CLI is installed"
fi

# Install dependencies
print_status "Installing dependencies..."
npm install
print_success "Dependencies installed"

# Setup environment variables
print_status "Setting up environment variables..."
if [ ! -f .env.local ]; then
    if [ -f env.example ]; then
        cp env.example .env.local
        print_success "Created .env.local from env.example"
        print_warning "Please edit .env.local with your local Supabase credentials"
    else
        print_warning "env.example not found. You may need to create .env.local manually"
    fi
else
    print_success ".env.local already exists"
fi

# Start Supabase local instance
print_status "Starting Supabase local instance..."
if supabase status >/dev/null 2>&1; then
    print_warning "Supabase is already running"
else
    supabase start
    print_success "Supabase local instance started"
fi

# Wait a moment for Supabase to be fully ready
sleep 2

# Generate TypeScript types
print_status "Generating TypeScript types from database schema..."
if npm run gen:types; then
    print_success "TypeScript types generated"
else
    print_warning "Failed to generate types. You may need to run 'npm run gen:types' manually"
fi

# Verify setup
print_status "Verifying setup..."

# Check if Supabase is running
if supabase status >/dev/null 2>&1; then
    print_success "Supabase is running"
else
    print_error "Supabase is not running. Please run 'supabase start' manually"
    exit 1
fi

# Check if types were generated
if [ -f "packages/shared/src/types/database.ts" ]; then
    print_success "TypeScript types file exists"
else
    print_warning "TypeScript types file not found. Run 'npm run gen:types' manually"
fi

echo ""
print_success "Local development environment setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env.local with your local Supabase credentials (if needed)"
echo "  2. Start development servers:"
echo "     npm run dev:all"
echo ""
echo "Or start individually:"
echo "  npm run web      # Web app on http://localhost:5173"
echo "  npm run mobile   # Mobile app (Expo)"
echo ""

