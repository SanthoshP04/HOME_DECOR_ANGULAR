// ---------------------------------- All Requires -------------------------------------
const UserModel = require("../Models/UserModel");
const OrderModel = require("../Models/OrderModel");
const ProductModel = require("../Models/productsModel");
const UserValidate = require("../Utils/UserValidate");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const cloudUpload = require("../Utils/Cloudinary");
const { generateVerificationCode, sendVerificationEmail } = require("../Utils/emailService");
// ---------------------------------- Get All Users  ------------------------------------
let GetAllUsers = async (req, res) => {
  // => for testing routes
  try {
    let users = await UserModel.find({});
    if (!users) return res.json({ message: "No Users Found" });
    return res.json(users);
  } catch (err) {
    return res.json(err);
  }
};
// ---------------------------------- Get User By ID  -----------------------------------
let GetUserById = async (req, res) => {
  try {
    let user = await UserModel.findById(req.params.id);
    if (!user) return res.json({ message: "No User Found" });
    return res.json(user);
  } catch (err) {
    return res.json(err);
  }
};
// ---------------------------------- Add New User  -------------------------------------
let AddNewUser = async (req, res) => {
  try {
    let { error } = UserValidate(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    let salt = await bcrypt.genSalt(10);
    let password = req.body.password;
    let hashedPassword = await bcrypt.hash(password, salt);


    let uploadedImage = await cloudUpload(req.files[0].path);

    let user = new UserModel({
      username: req.body.username,
      email: req.body.email,
      password: hashedPassword,
      image: uploadedImage.url,
      gender: req.body.gender,
    });
    await user.save();
    return res.json({ message: "User Added Successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
// ---------------------------------- Update User By ID  --------------------------------
const UpdateUser = async (req, res) => {
  const id = req.params.id;

  try {
    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Create an object to hold the updates
    const updateData = {};

    // Handle password update
    if (req.body.password) {
      try {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
        updateData.password = hashedPassword;
      } catch (error) {
        return res
          .status(500)
          .json({ message: "Error hashing password", error: error.message });
      }
    }

    // Handle image upload
    if (req.files && req.files[0] !== undefined) {
      try {
        let uploadedImage = await cloudUpload(req.files[0].path);
        updateData.image = uploadedImage.url;
      } catch (error) {
        return res
          .status(500)
          .json({ message: "Error uploading image", error: error.message });
      }
    }

    // Handle orders update
    if (req.body.orders) {
      updateData.orders = req.body.orders;
    }

    // Handle other fields (excluding password and orders which are handled above)
    Object.keys(req.body).forEach(key => {
      if (key !== 'password' && key !== 'orders') {
        updateData[key] = req.body[key];
      }
    });

    // Update the user
    const updatedUser = await UserModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    // Update username in orders if username was changed
    if (req.body.username && user.username !== req.body.username) {
      await OrderModel.updateMany(
        { userId: id },
        { $set: { username: req.body.username } }
      );
    }

    return res.json(updatedUser);

  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error updating user", error: error.message });
  }
};
// ---------------------------------- Delete User By ID  ---------------------------------
let DeleteUser = async (req, res) => {
  try {
    let user = await UserModel.findByIdAndDelete(req.params.id);
    if (!user) return res.json({ message: "No User Found" });
    return res.json({ message: "User Deleted Successfully" });
  } catch (err) {
    return res.json(err);
  }
};

// ---------------------------------- Login User  ---------------------------------------
let LoginUser = async (req, res) => {
  const user = await UserModel.findOne({ email: req.body.email });

  if (!user) {
    return res.status(400).send({ message: "Invalid Email or Password" });
  }

  // Add the email verification check here
  if (!user.emailVerified) {
    return res.status(403).send({ message: "Please verify your email to log in." });
  }

  const validPassword = await bcrypt.compare(req.body.password, user.password);

  if (!validPassword) {
    return res.status(400).send({ message: "Invalid Email or Password" });
  }

  const { _id } = user.toJSON();
  const token = jwt.sign({ _id: _id }, "secret");

  res.cookie("jwt", token, {
    httpOnly: true,
    maxAge: 24 * 30 * 60 * 60 * 1000,
  });

  return res
    .status(200)
    .json({ message: "User Logged In Successfully", user: user });
};
// ---------------------------------- Register User  ------------------------------------
let RegisterUser = async (req, res) => {
  let { error } = UserValidate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  try {
    let name = req.body.username;
    let email = req.body.email;
    let password = req.body.password;
    let gender = req.body.gender;

    let salt = await bcrypt.genSalt(10);
    let hashedPassword = await bcrypt.hash(password, salt);

    let checkUser = await UserModel.findOne({ email: email });
    if (checkUser) {
      return res.status(400).json({ message: "User Already Exists" });
    } else {
      // Generate verification code
      const verificationCode = generateVerificationCode();
      const verificationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

      let newUser = new UserModel({
        username: name,
        email: email,
        password: hashedPassword,
        gender: gender,
        emailVerified: false, // Add email verification fields
        verificationCode: verificationCode,
        verificationCodeExpires: verificationCodeExpires
      });

      let savedUser = await newUser.save();

      // Send verification email
      const emailSent = await sendVerificationEmail(email, verificationCode);

      if (emailSent) {
        return res
          .status(201)
          .json({
            message: "User Created Successfully. Please check your email for verification.",
            user: savedUser,
            needsVerification: true
          });
      } else {
        return res
          .status(201)
          .json({
            message: "User Created Successfully. Failed to send verification email.",
            user: savedUser,
            needsVerification: true
          });
      }
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// ---------------------------------- Verify Email  ------------------------------------
let VerifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required'
      });
    }

    // Find user
    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Check if code matches and is not expired
    if (user.verificationCode !== code) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    if (user.verificationCodeExpires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired'
      });
    }

    // Update user as verified
    user.emailVerified = true;
    user.verificationCode = null;
    user.verificationCodeExpires = null;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ---------------------------------- Resend Verification Code  ------------------------
let ResendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user
    const user = await UserModel.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new code and set expiration
    user.verificationCode = generateVerificationCode();
    user.verificationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 minutes from now
    await user.save();

    // Send verification email
    const emailSent = await sendVerificationEmail(email, user.verificationCode);

    if (emailSent) {
      res.json({
        success: true,
        message: 'New verification code sent to your email'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send verification email'
      });
    }
  } catch (error) {
    console.error('Error resending verification:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ---------------------------------- Add Product To Cart ------------------------
let AddProductToCart = async (req, res) => {
  const { user_id, product, quantity } = req.body;

  try {
    const user = await UserModel.findById(user_id);
    const productt = await ProductModel.findById(product);

    if (!user || !productt) {
      return res.status(404).json({ message: "User or product not found" });
    }

    const existingItemIndex = user.carts.findIndex(
      (item) => item.product.toString() === product.toString()
    );

    if (existingItemIndex !== -1) {
      const newQuantity = user.carts[existingItemIndex].quantity + quantity;
      if (newQuantity > productt.quantity) {
        return res.status(400).json({ message: "Quantity exceeds stock" });
      } else {
        user.carts[existingItemIndex].quantity = newQuantity;
        productt.quantity -= quantity;
        await productt.save();
      }
    } else {
      if (quantity > productt.quantity) {
        return res.status(400).json({ message: "Quantity exceeds stock" });
      } else {
        user.carts.push({ product: product, quantity: quantity });
        productt.quantity -= quantity;
        await productt.save();
      }
    }

    await user.save();
    const { password, ...userData } = user.toObject();
    return res
      .status(201)
      .json({ message: "Item added to cart successfully", user: userData });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Add products to order
 */
let AddProductToOrder = async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const productIds = user.carts.map(item => item.product);
    const products = await ProductModel.find({ _id: { $in: productIds } });

    let totalPrice = 0;
    user.carts.forEach(item => {
      const product = products.find(p => p._id.toString() === item.product.toString());
      if (product) {
        totalPrice += product.price * item.quantity;
      }
    });
    totalPrice += 300;

    const orderProducts = user.carts.map(item => item.product);

    user.carts = [];

    await user.save();

    const order = new OrderModel({
      userId: user._id,
      username: user.username,
      date: new Date(),
      totalPrice: totalPrice,
      products: orderProducts,
      status: "Pending"
    });

    await order.save();
    user.orders.push(order._id);
    await user.save();

    res.status(200).json({ message: "Products added to order successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------------------------- Remove Product From Cart ------------------------
let RemoveProductFromCart = async (req, res) => {
  const { userid, productid } = req.body;

  try {
    const user = await UserModel.findById(userid);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const cartItem = user.carts.find(
      (item) => item.product.toString() === productid
    );
    if (!cartItem) {
      return res
        .status(404)
        .json({ message: "Product not found in user's cart" });
    }

    const CartItemQunatity = cartItem.quantity;

    user.carts = user.carts.filter(
      (item) => item.product.toString() !== productid
    );
    await user.save();

    const product = await ProductModel.findById(productid);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.quantity += CartItemQunatity;
    await product.save();

    res.status(200).json({ message: "Product removed from cart successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
// ---------------------------------- Update Product Quantity ------------------------
let IncreaseProductQuantity = async (req, res) => {
  const { userid, productid } = req.body;

  try {
    const user = await UserModel.findById(userid);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const cartItem = user.carts.find(
      (item) => item.product.toString() === productid
    );
    if (!cartItem) {
      return res
        .status(404)
        .json({ message: "Product not found in user's cart" });
    }

    cartItem.quantity += 1;
    await user.save();

    const product = await ProductModel.findById(productid);
    if (!product || product.quantity == 0) {
      return res
        .status(404)
        .json({ message: "Product not found or out of stock" });
    }
    product.quantity -= 1;
    await product.save();

    res
      .status(200)
      .json({ message: "Product quantity increased successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

let DecreaseProductQuantity = async (req, res) => {
  const { userid, productid } = req.body;

  try {
    const user = await UserModel.findById(userid);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const cartItem = user.carts.find(
      (item) => item.product.toString() === productid
    );
    if (!cartItem) {
      return res
        .status(404)
        .json({ message: "Product not found in user's cart" });
    }

    if (cartItem.quantity !== 1) {
      cartItem.quantity -= 1;
    }
    await user.save();

    const product = await ProductModel.findById(productid);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    product.quantity += 1;
    await product.save();

    res
      .status(200)
      .json({ message: "Product quantity decreased successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------------------------- Get Cart By User ID ------------------------
let GetCartByUserId = async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ cart: user.carts });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

let GetOrdersByUserId = async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await UserModel.findById(userId).populate("orders");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ orders: user.orders });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const GetUserByToken = async (req, res) => {
  try {
    const cookie = req.cookies["jwt"];
    if (!cookie) {
      // console.log("JWT cookie not found")
      return res
        .status(401)
        .json({ message: "Unauthorized: JWT cookie not found" });
    }
    const claims = jwt.verify(cookie, "secret");
    if (!claims) {
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    }

    const user = await UserModel.findOne({ _id: claims._id });
    if (!user) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    const { password, ...data } = user.toJSON();
    return res.json({ data: data });
  } catch (error) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const userLogout = async (req, res) => {
  try {
    const cookie = req.cookies["jwt"];
    if (cookie) {
      res.clearCookie("jwt").send("Logout successful");
    } else {
      res.send("No JWT cookie found");
    }
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// ---------------------------------- Export All Functions  ------------------------------
module.exports = {
  GetAllUsers,
  GetUserById,
  AddNewUser,
  UpdateUser,
  DeleteUser,
  LoginUser,
  RegisterUser,
  AddProductToCart,
  RemoveProductFromCart,
  IncreaseProductQuantity,
  DecreaseProductQuantity,
  GetCartByUserId,
  GetOrdersByUserId,
  AddProductToOrder,
  GetUserByToken,
  userLogout,
  VerifyEmail,
  ResendVerification
};
// ---------------------------------- End Of Controller ----------------------------------
