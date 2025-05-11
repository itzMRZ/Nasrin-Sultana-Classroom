import { Request, Response } from 'express';
import User, { IUser } from '../models/User';
import path from 'path';
import fs from 'fs';

// @desc    Display current user's profile
// @route   GET /profile
// @access  Private
export const renderProfile = async (req: Request, res: Response) => {
  console.log('Entering renderProfile controller method');
  try {
    // User is attached to req.session.user by isAuthenticated middleware
    console.log('Session user:', req.session.user);
    const user = await User.findById(req.session.user?.id).select('-password');
    if (!user) {
      // This case should ideally not happen if isAuthenticated works correctly
      console.log('User not found in database');
      req.flash('error_msg', 'User not found.');
      return res.redirect('/auth/login');
    }
    console.log('Found user in database, rendering profile');
    res.render('profile/profile', {
      title: 'My Profile',
      user: req.session.user, // Pass the session user for navbar and basic info
      profileData: user, // Pass the full user document for profile display
      path: '/profile'
    });
  } catch (error) {
    console.error('Error in renderProfile:', error);
    req.flash('error_msg', 'Error fetching profile.');
    res.redirect('/'); // Or an appropriate error page
  }
};

// @desc    Show form to edit current user's profile
// @route   GET /profile/edit
// @access  Private
export const renderEditProfileForm = async (req: Request, res: Response) => {
  console.log('Entering renderEditProfileForm controller method');
  try {
    const user = await User.findById(req.session.user?.id).select('-password');
    if (!user) {
      console.log('User not found in database');
      req.flash('error_msg', 'User not found.');
      return res.redirect('/auth/login');
    }
    console.log('Found user in database, rendering edit profile form');
    res.render('profile/edit-profile', {
      title: 'Edit Profile',
      user: req.session.user,
      profileData: user,
      path: '/profile/edit'
    });
  } catch (error) {
    console.error('Error in renderEditProfileForm:', error);
    req.flash('error_msg', 'Error fetching profile for editing.');
    res.redirect('/profile');
  }
};

// @desc    Update current user's profile
// @route   POST /profile/edit
// @access  Private
export const updateProfile = async (req: Request, res: Response) => {
  console.log('Entering updateProfile controller method');
  const { firstName, lastName, username, email } = req.body;
  try {
    const userId = req.session.user?.id;
    const userToUpdate = await User.findById(userId);

    if (!userToUpdate) {
      console.log('User not found in database');
      req.flash('error_msg', 'User not found.');
      return res.redirect('/auth/login');
    }

    // Basic validation (can be expanded with a library like Joi or express-validator)
    if (!firstName || !lastName || !username || !email) {
      console.log('Validation failed: Missing required fields');
      if (req.file) {
        // Clean up uploaded file if validation fails
        fs.unlinkSync(req.file.path);
      }
      req.flash('error_msg', 'Please fill in all required fields.');
      return res.redirect('/profile/edit');
    }

    // Check if username or email is being changed to one that already exists
    if (username !== userToUpdate.username) {
      const existingUserByUsername = await User.findOne({ username });
      if (existingUserByUsername) {
        console.log('Validation failed: Username already taken');
        if (req.file) fs.unlinkSync(req.file.path);
        req.flash('error_msg', 'Username already taken.');
        return res.redirect('/profile/edit');
      }
    }
    if (email !== userToUpdate.email) {
      const existingUserByEmail = await User.findOne({ email });
      if (existingUserByEmail) {
        console.log('Validation failed: Email already registered');
        if (req.file) fs.unlinkSync(req.file.path);
        req.flash('error_msg', 'Email already registered.');
        return res.redirect('/profile/edit');
      }
    }

    userToUpdate.firstName = firstName;
    userToUpdate.lastName = lastName;
    userToUpdate.username = username;
    userToUpdate.email = email;

    if (req.file) {
      // If a new profile image is uploaded, delete the old one (unless it's the default)
      if (userToUpdate.profileImage && userToUpdate.profileImage !== '/images/default_user_image.jpg') {
        const oldImagePath = path.join(__dirname, '../../public', userToUpdate.profileImage);
        if (fs.existsSync(oldImagePath)) {
          try {
            fs.unlinkSync(oldImagePath);
          } catch (err) {
            console.error('Failed to delete old profile image:', err);
            // Not a fatal error, so we can continue
          }
        }
      }
      userToUpdate.profileImage = `/uploads/profiles/${req.file.filename}`;
    }

    await userToUpdate.save();

    // Update session user details if they changed
    if (req.session.user) {
        req.session.user.username = userToUpdate.username;
        req.session.user.email = userToUpdate.email; // Also update email in session
        // You might want to update other session fields if necessary
    }

    console.log('Profile updated successfully');
    req.flash('success_msg', 'Profile updated successfully.');
    res.redirect('/profile');

  } catch (error) {
    console.error('Error in updateProfile:', error);
    if (req.file) {
      // Clean up uploaded file if an error occurs during DB operation
      fs.unlinkSync(req.file.path);
    }
    req.flash('error_msg', 'Error updating profile.');
    res.redirect('/profile/edit');
  }
};

// @desc    Display a specific user's profile
// @route   GET /profile/:userId
// @access  Private (can be made public if needed)
export const renderUserProfileById = async (req: Request, res: Response) => {
  console.log('Entering renderUserProfileById controller method');
  try {
    const userToView = await User.findById(req.params.userId).select('-password');
    if (!userToView) {
      console.log('User not found in database');
      req.flash('error_msg', 'User not found.');
      return res.status(404).render('404', { title: 'User Not Found', user: req.session.user, path: '' });
    }    // If the user being viewed is the logged-in user, redirect to their own profile page
    if (req.session.user && userToView._id && req.session.user.id === userToView._id.toString()) {
        console.log('Redirecting to own profile page');
        return res.redirect('/profile');
    }

    console.log('Found user in database, rendering profile');
    res.render('profile/profile', { // Re-use the profile.ejs, but pass different data
      title: `${userToView.firstName} ${userToView.lastName}'s Profile`,
      user: req.session.user, // Logged-in user for navbar
      profileData: userToView, // The user whose profile is being viewed
      path: '/profile' // Or a more specific path if you want to highlight it differently
    });
  } catch (error) {
    console.error('Error in renderUserProfileById:', error);
    req.flash('error_msg', 'Error fetching user profile.');
    res.status(500).render('500', { title: 'Server Error', user: req.session.user, path: '' }); // Assuming you have a 500.ejs
  }
};
