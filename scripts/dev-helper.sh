#!/bin/bash

# Development Helper Script for Beaker Stack
# This script helps manage development processes and port conflicts

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

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    local process_name=$2
    
    print_status "Checking for processes on port $port..."
    
    if lsof -ti:$port > /dev/null 2>&1; then
        print_warning "Found processes on port $port, killing them..."
        lsof -ti:$port | xargs kill -9 2>/dev/null || true
        print_success "Killed processes on port $port"
    else
        print_status "No processes found on port $port"
    fi
}

# Function to kill Metro bundler processes
kill_metro() {
    print_status "Killing Metro bundler processes..."
    pkill -f "metro" 2>/dev/null || true
    print_success "Metro processes killed"
}

# Function to kill Expo processes
kill_expo() {
    print_status "Killing Expo processes..."
    pkill -f "expo" 2>/dev/null || true
    print_success "Expo processes killed"
}

# Function to clean all development processes
clean_all() {
    print_status "Cleaning all development processes..."
    
    # Kill processes on common ports
    kill_port 8081 "Metro/React Native"
    kill_port 8082 "Beaker Stack Mobile"
    kill_port 5173 "Vite/Web App"
    kill_port 4173 "Vite Preview"
    kill_port 54321 "Supabase Local"
    
    # Kill Metro and Expo processes
    kill_metro
    kill_expo
    
    print_success "All development processes cleaned"
}

# Function to check if ports are available
check_ports() {
    print_status "Checking port availability..."
    
    local ports=(8081 8082 5173 4173 54321)
    local available=true
    
    for port in "${ports[@]}"; do
        if lsof -ti:$port > /dev/null 2>&1; then
            print_warning "Port $port is in use"
            available=false
        else
            print_success "Port $port is available"
        fi
    done
    
    if [ "$available" = true ]; then
        print_success "All ports are available"
    else
        print_warning "Some ports are in use. Run './scripts/dev-helper.sh clean' to free them up"
    fi
}

# Function to start development environment
start_dev() {
    print_status "Starting development environment..."
    
    # Check if ports are available
    if lsof -ti:8081 > /dev/null 2>&1 || lsof -ti:5173 > /dev/null 2>&1; then
        print_warning "Some ports are in use. Cleaning up..."
        clean_all
        sleep 2
    fi
    
    print_status "Starting all development servers..."
    npm run dev:all
}

# Main script logic
case "${1:-help}" in
    "clean")
        clean_all
        ;;
    "check")
        check_ports
        ;;
    "start")
        start_dev
        ;;
    "kill-metro")
        kill_metro
        ;;
    "kill-expo")
        kill_expo
        ;;
    "kill-port")
        if [ -z "$2" ]; then
            print_error "Please specify a port number"
            echo "Usage: $0 kill-port <port>"
            exit 1
        fi
        kill_port "$2" "Process"
        ;;
    "help"|*)
        echo "Beaker Stack Development Helper"
        echo ""
        echo "Usage: $0 <command>"
        echo ""
        echo "Commands:"
        echo "  clean       - Kill all development processes and free up ports"
        echo "  check       - Check which ports are available"
        echo "  start       - Start all development servers (with cleanup if needed)"
        echo "  kill-metro  - Kill Metro bundler processes"
        echo "  kill-expo   - Kill Expo processes"
        echo "  kill-port   - Kill processes on a specific port"
        echo "  help        - Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 clean"
        echo "  $0 check"
        echo "  $0 start"
        echo "  $0 kill-port 8081"
        ;;
esac
