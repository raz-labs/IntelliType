// Test for nested type matching accuracy

// This should match User type with lower compatibility now
// because profile structure doesn't match exactly
const testUserWithWrongProfile = {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    createdAt: new Date(),
    profile: {
        // Missing: avatar, bio, socialLinks (required by User interface)
        // Extra: wrongField (not in User interface)
        wrongField: "This shouldn't be here",
        someOtherField: "Another wrong field"
    },
    settings: {
        theme: "dark",
        notifications: {
            email: true,
            push: false,
            sms: true,
            frequency: "daily"
        },
        privacy: {
            profileVisible: true,
            showEmail: false,
            allowMessages: true,
            dataSharing: {
                analytics: true,
                marketing: false,
                thirdParty: false
            }
        }
    }
};

// This should match User type with high compatibility
// because profile structure matches exactly
const testUserWithCorrectProfile = {
    id: 2,
    name: "Jane Smith", 
    email: "jane@example.com",
    createdAt: new Date(),
    profile: {
        avatar: "https://example.com/avatar.jpg",
        bio: "Software developer",
        socialLinks: {
            github: "https://github.com/janesmith",
            linkedin: "https://linkedin.com/in/janesmith"
        }
    },
    settings: {
        theme: "gray",
        notifications: {
            email: true,
            push: true,
            sms: false,
            frequency: "immediate"
        },
        privacy: {
            profileVisible: true,
            showEmail: true,
            allowMessages: true,
            dataSharing: {
                analytics: false,
                marketing: false,
                thirdParty: false
            }
        }
    }
}; 