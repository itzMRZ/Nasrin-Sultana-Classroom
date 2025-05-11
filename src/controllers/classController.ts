import { Request, Response } from 'express';
import Class from '../models/Class';
import User, { IUser } from '../models/User'; // Import IUser
import Post from '../models/Post'; // Import Post model
import Comment from '../models/Comment'; // Import Comment model
import { validationResult } from 'express-validator';

// Helper function to generate random invite code
function generateInviteCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 7; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export const getClasses = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.session.user) {
      res.redirect('/auth/login');
      return;
    }

    const userId = req.session.user.id;
    let classes;

    if (req.session.user.role === 'teacher') {
      // Teachers see classes they created
      classes = await Class.find({ createdBy: userId }).populate('createdBy', 'firstName lastName');
    } else {
      // Students see classes they're enrolled in
      classes = await Class.find({ students: userId }).populate('createdBy', 'firstName lastName');
    }

    res.render('class/classes', {
      title: 'My Classes',
      user: req.session.user,
      classes
    });
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).render('error', {
      title: 'Error',
      user: req.session.user,
      message: 'Failed to load classes'
    });
  }
};

export const getCreateClassPage = (req: Request, res: Response): void => {
  if (!req.session.user) {
    res.redirect('/auth/login');
    return;
  }

  // Only teachers can create classes
  if (req.session.user.role !== 'teacher') {
    res.status(403).render('error', {
      title: 'Access Denied',
      user: req.session.user,
      message: 'Only teachers can create classes'
    });
    return;
  }

  res.render('class/create', {
    title: 'Create Class',
    user: req.session.user
  });
};

export const createClass = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.session.user) {
      res.redirect('/auth/login');
      return;
    }

    // Only teachers can create classes
    if (req.session.user.role !== 'teacher') {
      res.status(403).render('error', {
        title: 'Access Denied',
        user: req.session.user,
        message: 'Only teachers can create classes'
      });
      return;
    }

    const { name, section, subject, room } = req.body;
    const userId = req.session.user.id;

    const newClass = new Class({
      name,
      section,
      subject,
      room,
      createdBy: userId,
      inviteCode: generateInviteCode()
    });

    await newClass.save();
    res.redirect('/class');
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).render('class/create', {
      title: 'Create Class',
      user: req.session.user,
      error: 'Failed to create class'
    });
  }
};

export const getClassDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.session.user) {
      res.redirect('/auth/login');
      return;
    }

    const classId = req.params.id;
    const userId = req.session.user.id;

    const classItem = await Class.findById(classId)
      .populate<{ createdBy: IUser }>('createdBy', 'firstName lastName email profileImage username _id')
      .populate<{ students: IUser[] }>('students', 'firstName lastName email profileImage username _id')
      .lean();

    if (!classItem) {
      res.status(404).render('error', {
        title: 'Class Not Found',
        user: req.session.user,
        message: 'The requested class was not found'
      });
      return;
    }

    const teacher = classItem.createdBy;
    const students = classItem.students;

    const isTeacher = teacher && teacher._id && teacher._id.toString() === userId;
    const isStudent = students && Array.isArray(students) && students.some(student => student && student._id && student._id.toString() === userId);

    if (!isTeacher && !isStudent) {
      res.status(403).render('error', {
        title: 'Access Denied',
        user: req.session.user,
        message: 'You are not a member of this class'
      });
      return;
    }    // Fetch posts for the class stream, sorted by newest first
    const posts = await Post.find({ classId: classId })
                            .populate<{ userId: IUser }>('userId', 'firstName lastName profileImage username')
                            .sort({ createdAt: -1 })
                            .lean();

    // Fetch comments for all posts and organize them by post ID
    const postIds = posts.map(post => post._id);
    const comments = await Comment.find({ postId: { $in: postIds } })
                                 .populate<{ userId: IUser }>('userId', 'firstName lastName profileImage username')
                                 .sort({ createdAt: 1 })
                                 .lean();

    // Group comments by post ID for easy access in the template
    const commentsByPost = comments.reduce((acc: {[key: string]: any[]}, comment) => {
      const postId = comment.postId.toString();
      if (!acc[postId]) {
        acc[postId] = [];
      }
      acc[postId].push(comment);
      return acc;
    }, {});

    res.render('class/details', {
      title: classItem.name,
      user: req.session.user,
      cls: classItem,
      isTeacher,
      posts,
      commentsByPost
    });
  } catch (error) {
    console.error('Error fetching class details:', error);
    res.status(500).render('error', {
      title: 'Error',
      user: req.session.user,
      message: 'Failed to load class details'
    });
  }
};

export const joinClass = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.session.user) {
      res.redirect('/auth/login');
      return;
    }

    const { inviteCode } = req.body;
    const userId = req.session.user.id;

    // Find the class with the invite code
    const classItem = await Class.findOne({ inviteCode });

    if (!classItem) {
      res.render('class/join', {
        title: 'Join Class',
        user: req.session.user,
        error: 'Invalid invite code'
      });
      return;
    }

    // Check if user is already a student in this class
    if (classItem.students.includes(userId as any)) { // Added 'as any' to satisfy older Mongoose/TS versions if _id is not directly comparable
      res.render('class/join', {
        title: 'Join Class',
        user: req.session.user,
        error: 'You are already enrolled in this class'
      });
      return;
    }

    // Add student to the class
    classItem.students.push(userId as any); // Added 'as any' for consistency
    await classItem.save();

    res.redirect(`/class/${classItem._id}`);
  } catch (error) {
    console.error('Error joining class:', error);
    res.render('class/join', {
      title: 'Join Class',
      user: req.session.user,
      error: 'Failed to join class'
    });
  }
};

export const getJoinClassPage = (req: Request, res: Response): void => {
  if (!req.session.user) {
    res.redirect('/auth/login');
    return;
  }

  res.render('class/join', {
    title: 'Join Class',
    user: req.session.user,
    error: null
  });
};

// @desc    Display the people (teacher and students) in a class
// @route   GET /class/:id/people
// @access  Private
export const getPeoplePage = async (req: Request, res: Response): Promise<void> => {
  console.log('Entering getPeoplePage controller method');
  console.log('Class ID param:', req.params.id);
  console.log('Session user:', req.session.user);
  try {
    if (!req.session.user) {
      req.flash('error_msg', 'Please log in to view this page.');
      res.redirect('/auth/login');
      return;
    }

    const classId = req.params.id;
    const userId = req.session.user.id;

    const classItem = await Class.findById(classId)
      .populate<{ createdBy: IUser }>('createdBy', 'firstName lastName email profileImage username _id')
      .populate<{ students: IUser[] }>('students', 'firstName lastName email profileImage username _id')
      .lean();

    if (!classItem) {
      req.flash('error_msg', 'Class not found.');
      res.status(404).render('404', {
        title: 'Class Not Found',
        user: req.session.user,
        path: '/class'
      });
      return;
    }

    const teacher = classItem.createdBy;
    const students = classItem.students;

    // Check if user is authorized to view this class (either teacher or student)
    const isTeacher = teacher && teacher._id && teacher._id.toString() === userId;
    const isStudent = students && Array.isArray(students) && students.some(student => student && student._id && student._id.toString() === userId);

    if (!isTeacher && !isStudent) {
      req.flash('error_msg', 'You are not authorized to view this page.');
      res.status(403).render('403', {
        title: 'Access Denied',
        user: req.session.user,
        path: '/class'
      });
      return;
    }

    res.render('class/people', {
      title: `${classItem.name} - People`,
      user: req.session.user,
      cls: classItem,
      teacher: teacher,
      students: students,
      path: `/class/${classId}/people`
    });

  } catch (error) {
    console.error('Error fetching class people:', error);
    req.flash('error_msg', 'Failed to load class members.');
    res.status(500).render('500', {
        title: 'Server Error',
        user: req.session.user,
        path: '/class'
    });
  }
};

// @desc    Create a new post in a class stream
// @route   POST /class/:id/announcement
// @access  Private (Teacher only)
export const createPostInStream = async (req: Request, res: Response): Promise<void> => {
  console.log('createPostInStream: Received classId from params:', req.params.id);
  try {
    if (!req.session.user) {
      req.flash('error_msg', 'Please log in to post.');
      return res.redirect('/auth/login');
    }

    const classId = req.params.id;
    const userId = req.session.user.id;
    const { content, links } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!content || content.trim() === '') {
      req.flash('error_msg', 'Post content cannot be empty.');
      return res.redirect(`/class/${classId}`);
    }

    const classItem = await Class.findById(classId);
    console.log('createPostInStream: classItem found by ID:', classItem);

    if (!classItem) {
      req.flash('error_msg', 'Class not found.');
      return res.status(404).redirect('/class');
    }

    // Check if the logged-in user is the teacher of this class
    if (classItem.createdBy.toString() !== userId) {
      req.flash('error_msg', 'Only the teacher can post in the stream.');
      return res.status(403).redirect(`/class/${classId}`);
    }

    // Process attachments
    const attachments = {
      files: [] as string[],
      links: [] as string[]
    };    // Handle file uploads
    if (files && files.length > 0) {
      // Store file metadata instead of just paths
      attachments.files = files.map(file => ({
        path: `/uploads/stream/${file.filename}`,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      }));

      console.log('Files attached to post:', attachments.files);
    }

    // Handle links
    if (links) {
      const linkArray = Array.isArray(links) ? links : [links];
      attachments.links = linkArray.filter(link => link && link.trim() !== '');

      console.log('Links attached to post:', attachments.links);
    }

    const newPost = new Post({
      classId,
      userId,
      content,
      attachments
    });

    await newPost.save();
    req.flash('success_msg', 'Announcement posted successfully.');
    res.redirect(`/class/${classId}`);

  } catch (error) {
    console.error('Error creating post in stream:', error);
    req.flash('error_msg', 'Failed to post announcement. Please try again.');
    res.status(500).redirect(`/class/${req.params.id || ''}`);
  }
};

// @desc    Add a comment to a post in the class stream
// @route   POST /class/:id/post/:postId/comment
// @access  Private (Both teachers and students)
export const addCommentToPost = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.session.user) {
      req.flash('error_msg', 'Please log in to comment.');
      return res.redirect('/auth/login');
    }

    const { id: classId, postId } = req.params;
    const userId = req.session.user.id;
    const { content } = req.body;

    if (!content || content.trim() === '') {
      req.flash('error_msg', 'Comment content cannot be empty.');
      return res.redirect(`/class/${classId}`);
    }

    // Verify the class exists and user is a member
    const classItem = await Class.findById(classId);
    if (!classItem) {
      req.flash('error_msg', 'Class not found.');
      return res.status(404).redirect('/class');
    }

    const isTeacher = classItem.createdBy && classItem.createdBy.toString() === userId;
    const isStudent = classItem.students && Array.isArray(classItem.students) &&
                     classItem.students.some(student => student && student.toString() === userId);

    if (!isTeacher && !isStudent) {
      req.flash('error_msg', 'You are not authorized to comment in this class.');
      return res.status(403).redirect('/class');
    }

    // Verify the post exists and belongs to this class
    const post = await Post.findById(postId);
    if (!post || post.classId.toString() !== classId) {
      req.flash('error_msg', 'Post not found.');
      return res.redirect(`/class/${classId}`);
    }

    // Create and save the comment
    const newComment = new Comment({
      postId,
      userId,
      content
    });

    await newComment.save();
    req.flash('success_msg', 'Comment added successfully.');
    return res.redirect(`/class/${classId}`);

  } catch (error) {
    console.error('Error adding comment to post:', error);
    req.flash('error_msg', 'Failed to add comment.');
    return res.status(500).redirect(`/class/${req.params.id || ''}`);
  }
};
