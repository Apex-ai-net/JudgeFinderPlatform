#!/bin/bash

echo "🔍 Checking iOS Development Requirements..."
echo ""

# Check Xcode
if xcodebuild -version &> /dev/null; then
    echo "✅ Xcode: $(xcodebuild -version | head -n 1)"
else
    echo "❌ Xcode: NOT INSTALLED or not properly configured"
    echo "   Install from: Mac App Store → Search 'Xcode'"
fi

# Check Command Line Tools
if xcode-select -p &> /dev/null; then
    echo "✅ Command Line Tools: $(xcode-select -p)"
else
    echo "❌ Command Line Tools: NOT INSTALLED"
    echo "   Install with: xcode-select --install"
fi

# Check CocoaPods
if which pod &> /dev/null; then
    echo "✅ CocoaPods: $(pod --version)"
else
    echo "❌ CocoaPods: NOT INSTALLED"
    echo "   Install with: sudo gem install cocoapods"
fi

# Check Ruby
if which ruby &> /dev/null; then
    echo "✅ Ruby: $(ruby --version | cut -d' ' -f2)"
else
    echo "❌ Ruby: NOT INSTALLED"
fi

# Check Node
if which node &> /dev/null; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js: NOT INSTALLED"
fi

# Check npm
if which npm &> /dev/null; then
    echo "✅ npm: $(npm --version)"
else
    echo "❌ npm: NOT INSTALLED"
fi

# Check disk space
AVAILABLE=$(df -h / | awk 'NR==2 {print $4}')
echo "💾 Available Disk Space: $AVAILABLE"

# Check macOS version
MACOS_VERSION=$(sw_vers -productVersion)
echo "🖥️  macOS Version: $MACOS_VERSION"

echo ""
echo "📊 Summary:"
echo "   iOS project location: /Users/tannerosterkamp/JudgeFinderPlatform-1/ios/"

if xcodebuild -version &> /dev/null && which pod &> /dev/null; then
    echo "   ✅ Ready for iOS development!"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Open project: npm run ios:open"
    echo "   2. Follow: IOS_SETUP_CHECKLIST.md"
else
    echo "   ⚠️  Missing requirements - see above"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Install missing requirements"
    echo "   2. Run this script again to verify"
    echo "   3. Follow: START_HERE_IOS_SETUP.md"
fi

