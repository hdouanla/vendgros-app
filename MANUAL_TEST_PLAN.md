# Vendgros Application - Manual Test Plan

**Version:** 1.0
**Last Updated:** 2026-01-17
**Test Environment:** Local Development / Staging

---

## Table of Contents

1. [Test Preparation](#test-preparation)
2. [Authentication & Authorization](#1-authentication--authorization)
3. [Listing Creation & Management](#2-listing-creation--management)
4. [Search & Discovery](#3-search--discovery)
5. [Reservation Flow](#4-reservation-flow)
6. [Payment Processing](#5-payment-processing)
7. [Rating System](#6-rating-system)
8. [Messaging System](#7-messaging-system)
9. [User Profile](#8-user-profile)
10. [Seller Analytics Dashboard](#9-seller-analytics-dashboard)
11. [Admin & Moderation](#10-admin--moderation)
12. [Cross-Feature Integration Tests](#11-cross-feature-integration-tests)
13. [Edge Cases & Error Handling](#12-edge-cases--error-handling)
14. [Performance & UX](#13-performance--ux)
15. [Mobile Responsiveness](#14-mobile-responsiveness)

---

## Test Preparation

### Pre-Test Setup Checklist

- [ ] Database is seeded with test data
- [ ] Test user accounts created (buyer, seller, admin)
- [ ] Stripe test keys configured
- [ ] Email/SMS notifications configured (test mode)
- [ ] Image upload service is functional
- [ ] Geocoding service is working
- [ ] Browser cache cleared
- [ ] Test data spreadsheet ready for tracking results

### Test User Accounts Required

| Role | Email | Purpose |
|------|-------|---------|
| Buyer 1 | buyer1@test.com | Primary buyer account |
| Buyer 2 | buyer2@test.com | Secondary buyer for messaging |
| Seller 1 | seller1@test.com | Individual seller |
| Seller 2 | seller2@test.com | Merchant seller |
| Admin | admin@test.com | Admin/moderation tasks |

### Test Data Preparation

- [ ] 10+ test listings in various states (DRAFT, PUBLISHED, RESERVED, COMPLETED)
- [ ] 5+ categories represented
- [ ] Various price points (CAD $5 - $500)
- [ ] Listings at different locations/postal codes
- [ ] Test payment cards from Stripe documentation

---

## 1. Authentication & Authorization

### 1.1 User Registration

**Test Case 1.1.1: Sign Up with Email**

**Steps:**
1. Navigate to `/auth/signup`
2. Enter valid email: `newuser@test.com`
3. Enter password: `TestPass123!`
4. Confirm password: `TestPass123!`
5. Click "Sign Up"

**Expected Results:**
- [ ] User account created successfully
- [ ] Account status is `UNVERIFIED`
- [ ] User redirected to dashboard or onboarding
- [ ] Verification email sent
- [ ] Session cookie set

**Test Case 1.1.2: Sign Up with Discord OAuth**

**Steps:**
1. Navigate to `/auth/signup`
2. Click "Sign up with Discord"
3. Authorize on Discord
4. Complete profile if prompted

**Expected Results:**
- [ ] User authenticated via Discord
- [ ] Account created with Discord data
- [ ] Email auto-verified if from Discord
- [ ] Redirected to application
- [ ] Session created

**Test Case 1.1.3: Sign Up Validation**

**Steps:**
1. Try signing up with:
   - Empty email
   - Invalid email format
   - Password too short (<8 chars)
   - Mismatched password confirmation
   - Already registered email

**Expected Results:**
- [ ] Appropriate error messages displayed
- [ ] Form validation prevents submission
- [ ] "Email already exists" error shown for duplicate

---

### 1.2 User Sign In

**Test Case 1.2.1: Sign In with Valid Credentials**

**Steps:**
1. Navigate to `/auth/signin`
2. Enter email: `buyer1@test.com`
3. Enter correct password
4. Click "Sign In"

**Expected Results:**
- [ ] User authenticated successfully
- [ ] Redirected to intended page or dashboard
- [ ] Session cookie set
- [ ] User info available in header/navbar

**Test Case 1.2.2: Sign In with Invalid Credentials**

**Steps:**
1. Navigate to `/auth/signin`
2. Enter email: `buyer1@test.com`
3. Enter wrong password
4. Click "Sign In"

**Expected Results:**
- [ ] Error message: "Invalid email or password"
- [ ] User remains on sign-in page
- [ ] No session created
- [ ] Password field cleared

**Test Case 1.2.3: Sign In with Discord**

**Steps:**
1. Navigate to `/auth/signin`
2. Click "Sign in with Discord"
3. Authorize on Discord

**Expected Results:**
- [ ] User authenticated via OAuth
- [ ] Redirected to application
- [ ] Session created
- [ ] User info populated from Discord

---

### 1.3 Session Management

**Test Case 1.3.1: Session Persistence**

**Steps:**
1. Sign in with valid credentials
2. Close browser tab
3. Reopen and navigate to the site
4. Check if still logged in

**Expected Results:**
- [ ] User remains authenticated
- [ ] Session restored from cookie
- [ ] No re-login required

**Test Case 1.3.2: Sign Out**

**Steps:**
1. While signed in, click "Sign Out"
2. Confirm sign out if prompted
3. Try accessing protected route (e.g., `/profile`)

**Expected Results:**
- [ ] User signed out successfully
- [ ] Session cookie cleared
- [ ] Redirected to sign-in page
- [ ] Protected routes inaccessible

---

### 1.4 Account Status & Permissions

**Test Case 1.4.1: Suspended Account**

**Steps:**
1. Admin suspends test account
2. Try to sign in with suspended account
3. Observe behavior

**Expected Results:**
- [ ] Sign-in blocked or limited
- [ ] Message: "Account suspended. Contact support."
- [ ] Key features disabled

**Test Case 1.4.2: Banned Account**

**Steps:**
1. Admin bans test account
2. Try to sign in with banned account

**Expected Results:**
- [ ] Sign-in completely blocked
- [ ] Clear message about ban status
- [ ] No access to any features

**Test Case 1.4.3: Role-Based Access**

**Steps:**
1. Sign in as BUYER role
2. Try accessing `/admin/moderation`
3. Sign out and sign in as ADMIN
4. Try accessing `/admin/moderation`

**Expected Results:**
- [ ] Buyer denied access to admin routes (403 or redirect)
- [ ] Admin granted access
- [ ] Appropriate error messages

---

## 2. Listing Creation & Management

### 2.1 Create New Listing

**Test Case 2.1.1: Complete Listing Creation Flow**

**Steps:**
1. Sign in as `seller1@test.com`
2. Navigate to `/listings/create`
3. Fill in form:
   - Title: "Fresh Organic Apples - 10kg"
   - Description: "Locally grown organic apples from our farm. Sweet and crisp, perfect for eating fresh or baking. Available for pickup this weekend."
   - Category: GROCERIES
   - Price per piece: 25.00 CAD
   - Total quantity: 50
   - Max per buyer: 5
   - Upload 3 images
   - Address: "123 Main St, Toronto, ON M5V 3A8"
   - Pickup instructions: "Ring doorbell, pickup from garage"
4. Click "Save as Draft"

**Expected Results:**
- [ ] Draft listing created with status `DRAFT`
- [ ] All fields saved correctly
- [ ] Images uploaded and associated with listing
- [ ] Address geocoded to coordinates
- [ ] Redirected to listing preview or management page
- [ ] Success notification displayed

**Test Case 2.1.2: Image Upload**

**Steps:**
1. On create listing page, click "Upload Images"
2. Select 5 images (various formats: JPG, PNG, WEBP)
3. Observe upload progress
4. Remove 2 images
5. Add 1 more image

**Expected Results:**
- [ ] All images upload successfully
- [ ] Upload progress shown
- [ ] Thumbnails displayed
- [ ] Images can be removed
- [ ] Maximum 10 images enforced
- [ ] File size validation works
- [ ] Unsupported formats rejected

**Test Case 2.1.3: Form Validation**

**Steps:**
1. Try submitting listing with:
   - Title too short (< 5 chars)
   - Description too short (< 50 chars)
   - No category selected
   - Price = 0 or negative
   - Quantity = 0
   - No images
   - Invalid postal code

**Expected Results:**
- [ ] Each validation error displayed clearly
- [ ] Form submission blocked
- [ ] Fields highlighted in red
- [ ] Error messages specific and helpful
- [ ] Focus moves to first error

---

### 2.2 Submit Listing for Review

**Test Case 2.2.1: Submit Draft for Moderation**

**Steps:**
1. Navigate to draft listing
2. Click "Submit for Review"
3. Confirm submission

**Expected Results:**
- [ ] Status changes from `DRAFT` to `PENDING_REVIEW`
- [ ] Seller cannot edit while pending
- [ ] Notification sent to admins
- [ ] Seller sees "Under Review" status
- [ ] Estimated review time displayed

---

### 2.3 Edit Listing

**Test Case 2.3.1: Edit Draft Listing**

**Steps:**
1. Open draft listing
2. Click "Edit"
3. Change title, price, and description
4. Save changes

**Expected Results:**
- [ ] Changes saved successfully
- [ ] Updated timestamp recorded
- [ ] All modifications reflected
- [ ] Version tracking (if implemented)

**Test Case 2.3.2: Edit Published Listing**

**Steps:**
1. Open published listing
2. Try to edit
3. Change price and quantity
4. Save

**Expected Results:**
- [ ] Can edit certain fields (price, quantity, description)
- [ ] Cannot change fundamental details (category, location)
- [ ] Warning if changing price affects reservations
- [ ] Changes reflected immediately or after re-approval

---

### 2.4 Listing Management

**Test Case 2.4.1: View My Listings**

**Steps:**
1. Navigate to seller dashboard or "My Listings"
2. View listing in different states

**Expected Results:**
- [ ] All user's listings displayed
- [ ] Filtered by status (DRAFT, PUBLISHED, RESERVED, etc.)
- [ ] Quick actions available (Edit, Delete, View)
- [ ] Listing statistics shown (views, reservations)
- [ ] Sorted by creation date (newest first)

**Test Case 2.4.2: Delete Listing**

**Steps:**
1. Navigate to draft listing
2. Click "Delete"
3. Confirm deletion
4. Try deleting listing with active reservations

**Expected Results:**
- [ ] Draft deleted successfully
- [ ] Confirmation dialog shown
- [ ] Cannot delete listings with active reservations
- [ ] Soft delete or hard delete as per design
- [ ] Images removed from storage

**Test Case 2.4.3: Listing View Count**

**Steps:**
1. Create and publish a listing
2. Sign out
3. View the listing as guest or different user
4. Refresh several times
5. Sign back in as seller
6. Check view count

**Expected Results:**
- [ ] View count increments correctly
- [ ] Own views may or may not count (as per design)
- [ ] Count displayed on listing management page

---

## 3. Search & Discovery

### 3.1 Location-Based Search

**Test Case 3.1.1: Search by Current Location**

**Steps:**
1. Navigate to `/listings/search`
2. Click "Use My Location"
3. Grant location permission
4. Set radius to 10km
5. View results

**Expected Results:**
- [ ] Browser prompts for location permission
- [ ] User location captured (lat/long)
- [ ] Listings within 10km displayed
- [ ] Distance shown for each listing
- [ ] Results sorted by distance (nearest first)
- [ ] Map view shows pins at correct locations

**Test Case 3.1.2: Search by Postal Code**

**Steps:**
1. Navigate to `/listings/search`
2. Enter postal code: "M5V 3A8"
3. Set radius to 25km
4. Click "Search"

**Expected Results:**
- [ ] Postal code geocoded to coordinates
- [ ] Listings within 25km of postal code shown
- [ ] Distance calculated from postal code center
- [ ] Results displayed on map
- [ ] Invalid postal code shows error

**Test Case 3.1.3: Adjust Search Radius**

**Steps:**
1. Start with 5km radius
2. View result count
3. Increase to 50km
4. Observe new results
5. Try 100km

**Expected Results:**
- [ ] Results update dynamically
- [ ] More listings appear as radius increases
- [ ] Map zoom adjusts to fit all results
- [ ] Result count displayed
- [ ] Performance remains acceptable

---

### 3.2 Filtering & Sorting

**Test Case 3.2.1: Filter by Category**

**Steps:**
1. On search page, select "GROCERIES"
2. View results
3. Select "ELECTRONICS"
4. View updated results

**Expected Results:**
- [ ] Only groceries shown initially
- [ ] Filter switches to electronics
- [ ] Result count updates
- [ ] URL parameters update
- [ ] Filter persists on refresh

**Test Case 3.2.2: Filter by Price Range**

**Steps:**
1. Set minimum price: $10
2. Set maximum price: $100
3. View filtered results
4. Clear filters

**Expected Results:**
- [ ] Only listings in range displayed
- [ ] Price slider or input works smoothly
- [ ] Edge cases handled ($10 and $100 included)
- [ ] Clear filters resets to all results

**Test Case 3.2.3: Sort Results**

**Steps:**
1. Sort by "Distance" (default)
2. Sort by "Price: Low to High"
3. Sort by "Price: High to Low"
4. Sort by "Newest First"
5. Sort by "Rating: High to Low"

**Expected Results:**
- [ ] Each sort order works correctly
- [ ] Results reorder immediately
- [ ] Sorting persists in URL
- [ ] Correct sorting logic applied

**Test Case 3.2.4: Combined Filters**

**Steps:**
1. Select category: GROCERIES
2. Set price range: $5-$50
3. Set radius: 15km
4. Sort by price ascending
5. Apply all filters

**Expected Results:**
- [ ] All filters applied simultaneously
- [ ] Results match all criteria
- [ ] Filter summary displayed
- [ ] Can remove individual filters
- [ ] "Clear all filters" option available

---

### 3.3 Search Results Display

**Test Case 3.3.1: Grid View**

**Steps:**
1. View search results in grid view
2. Scroll through results
3. Click on a listing

**Expected Results:**
- [ ] Listings displayed in responsive grid
- [ ] Each card shows: image, title, price, distance, seller rating
- [ ] Hover effects work
- [ ] Click navigates to listing detail page
- [ ] Lazy loading for images

**Test Case 3.3.2: Map View**

**Steps:**
1. Switch to map view
2. Click on map markers
3. Zoom in and out
4. Pan around map

**Expected Results:**
- [ ] Map loads with all listing markers
- [ ] Clicking marker shows listing preview
- [ ] Map is interactive and smooth
- [ ] Clusters appear for nearby listings
- [ ] "View Details" link from map popup works

**Test Case 3.3.3: No Results**

**Steps:**
1. Search with very restrictive filters (e.g., $1000+ in 1km)
2. View empty state

**Expected Results:**
- [ ] "No listings found" message displayed
- [ ] Suggestions to broaden search shown
- [ ] Option to clear filters
- [ ] No errors or crashes

---

## 4. Reservation Flow

### 4.1 Create Reservation

**Test Case 4.1.1: Basic Reservation Creation**

**Steps:**
1. Sign in as `buyer1@test.com`
2. Navigate to a published listing
3. Select quantity: 2 (if max per buyer allows)
4. Click "Reserve Now"
5. Review reservation details
6. Confirm reservation

**Expected Results:**
- [ ] Reservation created with status `PENDING`
- [ ] 5% deposit amount calculated correctly
- [ ] Verification code (6-digit alphanumeric) generated
- [ ] QR code generated
- [ ] Available quantity reduced by 2
- [ ] Redirected to payment page
- [ ] Seller notified via email/SMS

**Test Case 4.1.2: Quantity Validation**

**Steps:**
1. Try to reserve more than max per buyer
2. Try to reserve more than available quantity
3. Try to reserve 0 quantity

**Expected Results:**
- [ ] Error: "Maximum X per buyer"
- [ ] Error: "Only X available"
- [ ] Validation prevents submission
- [ ] Current limits displayed clearly

**Test Case 4.1.3: Concurrent Reservations**

**Steps:**
1. Open listing in two browser windows (different buyers)
2. Both attempt to reserve last 5 units simultaneously
3. Submit both reservations

**Expected Results:**
- [ ] Only first successful, or items allocated properly
- [ ] Second buyer sees "Not enough available" if oversold
- [ ] Inventory correctly managed
- [ ] No negative quantities

---

### 4.2 View Reservations

**Test Case 4.2.1: Buyer View - My Reservations**

**Steps:**
1. Navigate to buyer dashboard or reservations page
2. View list of all reservations

**Expected Results:**
- [ ] All buyer's reservations listed
- [ ] Status clearly shown (PENDING, CONFIRMED, COMPLETED, CANCELLED)
- [ ] Listing details included
- [ ] Pickup date/time visible
- [ ] Actions available (Cancel, Pay Deposit, View Details)

**Test Case 4.2.2: Seller View - Incoming Reservations**

**Steps:**
1. Sign in as seller
2. Navigate to reservations/orders page
3. View incoming reservations

**Expected Results:**
- [ ] All reservations for seller's listings shown
- [ ] Buyer info displayed (name, contact)
- [ ] Payment status visible
- [ ] Verification code shown
- [ ] Actions: Mark as Completed, Cancel, Contact Buyer

**Test Case 4.2.3: Reservation Details Page**

**Steps:**
1. Click on a specific reservation
2. View full details

**Expected Results:**
- [ ] Full reservation information displayed:
  - Listing details
  - Quantity and total price
  - Deposit amount and status
  - Balance due (95%)
  - Verification code
  - QR code
  - Pickup location and instructions
  - Buyer/seller contact info
  - Status and timestamps

---

### 4.3 Cancel Reservation

**Test Case 4.3.1: Buyer Cancels Before Payment**

**Steps:**
1. Create a reservation
2. Before paying deposit, click "Cancel"
3. Confirm cancellation

**Expected Results:**
- [ ] Reservation status → `CANCELLED`
- [ ] Quantity returned to listing availability
- [ ] Cancellation timestamp recorded
- [ ] Seller notified
- [ ] No refund needed (no payment made)

**Test Case 4.3.2: Buyer Cancels After Deposit Paid**

**Steps:**
1. Create and pay deposit for reservation
2. Cancel reservation
3. Confirm

**Expected Results:**
- [ ] Reservation cancelled
- [ ] Refund process initiated
- [ ] Deposit returned to buyer (minus processing fee if applicable)
- [ ] Seller notified
- [ ] Quantity returned to listing

**Test Case 4.3.3: Seller Cancels Reservation**

**Steps:**
1. As seller, navigate to incoming reservation
2. Click "Cancel Order"
3. Provide reason
4. Confirm

**Expected Results:**
- [ ] Reservation cancelled
- [ ] Full deposit refunded to buyer
- [ ] Buyer notified immediately
- [ ] Reason recorded in system

---

### 4.4 Reservation Expiration

**Test Case 4.4.1: 48-Hour Expiration**

**Steps:**
1. Create a reservation
2. Wait 48 hours (or manipulate system time)
3. Check reservation status
4. Try to pay expired reservation

**Expected Results:**
- [ ] Reservation automatically expires after 48 hours
- [ ] Status changes to `EXPIRED`
- [ ] Quantity returned to listing
- [ ] Payment no longer accepted
- [ ] Buyer notified before expiration (reminder)

---

## 5. Payment Processing

### 5.1 Deposit Payment

**Test Case 5.1.1: Successful Stripe Payment**

**Steps:**
1. Create reservation (e.g., $100 total → $5 deposit)
2. Redirected to payment page `/payment/[reservationId]`
3. Enter Stripe test card: `4242 4242 4242 4242`
4. Expiry: Any future date
5. CVC: Any 3 digits
6. Click "Pay Deposit"

**Expected Results:**
- [ ] Stripe payment intent created
- [ ] Payment processed successfully
- [ ] Reservation status → `CONFIRMED`
- [ ] Payment confirmation shown
- [ ] Receipt/confirmation email sent
- [ ] Balance due ($95) clearly displayed
- [ ] Pickup instructions provided

**Test Case 5.1.2: Failed Payment**

**Steps:**
1. Create reservation
2. Use Stripe test card for declined payment: `4000 0000 0000 0002`
3. Attempt payment

**Expected Results:**
- [ ] Payment declined
- [ ] Error message displayed: "Your card was declined"
- [ ] Reservation remains `PENDING`
- [ ] User can retry with different card
- [ ] No charge processed

**Test Case 5.1.3: Payment Amount Verification**

**Steps:**
1. Create reservation for $80 total
2. Check deposit amount on payment page
3. Complete payment
4. Verify amount charged

**Expected Results:**
- [ ] Deposit = $4.00 (5% of $80)
- [ ] Amount clearly labeled
- [ ] Stripe charges exactly $4.00
- [ ] Balance due = $76.00
- [ ] All amounts match

**Test Case 5.1.4: Payment Methods**

**Steps:**
1. Test various Stripe test cards:
   - Visa: `4242 4242 4242 4242`
   - Mastercard: `5555 5555 5555 4444`
   - Amex: `3782 822463 10005`
2. Test with different payment methods if available (Apple Pay, Google Pay in test mode)

**Expected Results:**
- [ ] All major card types accepted
- [ ] Card brand detected and displayed
- [ ] Payment processed regardless of card type
- [ ] Alternative payment methods work (if implemented)

---

### 5.2 Payment Confirmation

**Test Case 5.2.1: Confirmation Page**

**Steps:**
1. Complete deposit payment
2. View confirmation page

**Expected Results:**
- [ ] Payment success message displayed
- [ ] Reservation confirmation number shown
- [ ] QR code visible for verification
- [ ] 6-digit verification code displayed
- [ ] Pickup details clearly stated:
  - Address
  - Instructions
  - Contact info
  - Balance due at pickup
- [ ] Option to download/print confirmation
- [ ] "Add to Calendar" link

**Test Case 5.2.2: Email Confirmation**

**Steps:**
1. Complete payment
2. Check buyer's email inbox

**Expected Results:**
- [ ] Confirmation email received within 1 minute
- [ ] Email contains:
  - Reservation details
  - Payment confirmation
  - QR code
  - Verification code
  - Pickup information
  - Seller contact info
  - Balance due reminder

---

### 5.3 Balance Payment at Pickup

**Test Case 5.3.1: Mark Reservation as Completed**

**Steps:**
1. Seller meets buyer at pickup
2. Buyer shows QR code or verification code
3. Seller verifies code
4. Buyer pays balance in cash/e-transfer
5. Seller marks reservation as `COMPLETED` in system

**Expected Results:**
- [ ] Verification code validation works
- [ ] QR code scannable and validates
- [ ] Status changes to `COMPLETED`
- [ ] Listing quantity not returned
- [ ] Both parties notified
- [ ] Rating flow initiated (7-day window starts)

**Test Case 5.3.2: No-Show Scenario**

**Steps:**
1. Buyer doesn't show up for pickup
2. Seller waits beyond agreed time
3. Seller marks as `NO_SHOW`

**Expected Results:**
- [ ] Status → `NO_SHOW`
- [ ] Deposit may be forfeited (per policy)
- [ ] Quantity returned to listing
- [ ] Buyer notified
- [ ] No-show tracked in buyer's record

---

## 6. Rating System

### 6.1 Submit Rating

**Test Case 6.1.1: Buyer Rates Seller**

**Steps:**
1. Complete a transaction (reservation marked `COMPLETED`)
2. Navigate to `/ratings/submit/[reservationId]` or click rating prompt
3. Select 5 stars
4. Enter comment: "Great seller! Apples were fresh and delicious."
5. Submit rating

**Expected Results:**
- [ ] Rating submitted successfully
- [ ] Status: Hidden (until seller also rates)
- [ ] Comment saved (max 500 chars enforced)
- [ ] Success message shown
- [ ] Cannot rate again for same transaction
- [ ] AI authenticity check runs on comment

**Test Case 6.1.2: Seller Rates Buyer**

**Steps:**
1. As seller, navigate to completed transaction
2. Click "Rate Buyer"
3. Select 4 stars
4. Comment: "Punctual and friendly buyer"
5. Submit

**Expected Results:**
- [ ] Seller rating submitted
- [ ] Both ratings now become visible (blind system)
- [ ] Average rating updated for both users
- [ ] Rating count incremented
- [ ] Both users notified that mutual rating is complete

**Test Case 6.1.3: Rating Validation**

**Steps:**
1. Try to submit rating without selecting stars
2. Try submitting with comment > 500 characters
3. Try rating before transaction completion
4. Try rating after 7-day window

**Expected Results:**
- [ ] Error: "Please select a rating"
- [ ] Character limit enforced (shows count)
- [ ] Error: "Cannot rate until transaction is complete"
- [ ] Error: "Rating period has expired" or warning shown

---

### 6.2 View Ratings

**Test Case 6.2.1: View Own Received Ratings**

**Steps:**
1. Navigate to profile page
2. Click "My Ratings" or "Reviews" tab
3. View all ratings received

**Expected Results:**
- [ ] All visible (mutual) ratings displayed
- [ ] Shows: star rating, comment, rater name, date
- [ ] Hidden ratings not shown
- [ ] Sorted by date (newest first)
- [ ] Average rating displayed prominently
- [ ] Total count shown

**Test Case 6.2.2: View Seller's Public Rating**

**Steps:**
1. Navigate to seller's profile from listing
2. View seller's rating display

**Expected Results:**
- [ ] Average rating shown (e.g., "4.8/5")
- [ ] Number of ratings (e.g., "Based on 24 reviews")
- [ ] Individual ratings visible
- [ ] Seller badge displayed if eligible
- [ ] Rating breakdown (5 stars: X, 4 stars: Y, etc.)

---

### 6.3 Blind Rating System

**Test Case 6.3.1: Rating Visibility - Only One Party Rated**

**Steps:**
1. Buyer rates seller (5 stars)
2. Check if buyer can see their own rating
3. Check if seller can see buyer's rating
4. Seller has not yet rated

**Expected Results:**
- [ ] Buyer sees: "You rated 5 stars - Hidden until seller rates you"
- [ ] Seller sees: "Buyer has rated you - Rate them to see it"
- [ ] Rating NOT counted in public averages yet
- [ ] Both prompted to complete mutual rating

**Test Case 6.3.2: Both Parties Rated**

**Steps:**
1. Both buyer and seller submit ratings
2. Check visibility

**Expected Results:**
- [ ] Both ratings now fully visible
- [ ] Displayed on respective profiles
- [ ] Counted in average ratings
- [ ] Timestamp shows when both were completed
- [ ] Comments visible to both parties

---

### 6.4 Rating Impact on Trust

**Test Case 6.4.1: Badge Eligibility After Ratings**

**Steps:**
1. As seller with no badge, complete transactions
2. Receive ratings that meet VERIFIED criteria:
   - 4.0+ average rating
   - 3+ reviews
   - 5+ transactions
3. Check profile

**Expected Results:**
- [ ] VERIFIED badge automatically awarded
- [ ] Badge displayed on profile
- [ ] Badge shown on listings
- [ ] Trust score increased

**Test Case 6.4.2: Low Rating Impact**

**Steps:**
1. User receives multiple 1-2 star ratings
2. Average falls below 3.0
3. Check account status and listing visibility

**Expected Results:**
- [ ] Low rating warning may appear
- [ ] Listings may be deprioritized in search
- [ ] Account flagged for review (if severe)
- [ ] User notified to improve service

---

## 7. Messaging System

### 7.1 Start Conversation

**Test Case 7.1.1: Buyer Messages Seller**

**Steps:**
1. As buyer, navigate to a listing
2. Click "Contact Seller" or "Message"
3. Type message: "Is this still available? Can I pick up tomorrow?"
4. Send message

**Expected Results:**
- [ ] Conversation created between buyer and seller
- [ ] Conversation linked to specific listing
- [ ] Message sent successfully
- [ ] Seller receives notification (email/SMS/in-app)
- [ ] Message thread appears in buyer's inbox
- [ ] Timestamp recorded

---

### 7.2 Message Exchange

**Test Case 7.2.1: Two-Way Conversation**

**Steps:**
1. Buyer sends message (from 7.1.1)
2. Seller receives notification and responds: "Yes, available! Pickup between 2-5pm works."
3. Buyer receives response and replies: "Perfect, I'll be there at 3pm"
4. Continue exchange

**Expected Results:**
- [ ] Messages appear in chronological order
- [ ] Real-time or near-real-time delivery
- [ ] Both parties see full conversation history
- [ ] Notifications sent for each new message
- [ ] Listing details visible in conversation sidebar
- [ ] Unread count updates correctly

**Test Case 7.2.2: Message with Attachments**

**Steps:**
1. In conversation, click "Attach Image"
2. Select 2 images
3. Add message text: "Here's a photo of the exact items"
4. Send

**Expected Results:**
- [ ] Up to 5 images can be attached
- [ ] Images uploaded before message sent
- [ ] Thumbnails shown in message thread
- [ ] Full-size images viewable on click
- [ ] Attachments display correctly for recipient

**Test Case 7.2.3: Message Validation**

**Steps:**
1. Try sending empty message (no text or attachments)
2. Try sending message > 5000 characters
3. Try attaching > 5 images

**Expected Results:**
- [ ] Cannot send empty message
- [ ] Character limit enforced (counter shown)
- [ ] Image limit enforced with error message

---

### 7.3 Message List & Notifications

**Test Case 7.3.1: View All Conversations**

**Steps:**
1. Navigate to `/messages`
2. View conversation list

**Expected Results:**
- [ ] All conversations listed
- [ ] Sorted by most recent activity
- [ ] Shows: other user name, listing title, last message preview
- [ ] Unread count badge on unread conversations
- [ ] Listing thumbnail displayed
- [ ] Timestamp of last message

**Test Case 7.3.2: Unread Messages**

**Steps:**
1. Have another user send you 3 messages
2. View conversation list
3. Click on conversation
4. Check unread count

**Expected Results:**
- [ ] Unread badge shows "3" on conversation
- [ ] Badge appears on messages icon in header
- [ ] Opening conversation marks messages as read
- [ ] Unread count updates to 0
- [ ] Read timestamp recorded

**Test Case 7.3.3: Notifications**

**Steps:**
1. User sends you a message while you're online
2. User sends message while you're offline
3. Check notification behavior

**Expected Results:**
- [ ] In-app notification appears (toast/banner)
- [ ] Email notification sent if offline > 10 minutes
- [ ] SMS notification (if enabled)
- [ ] Browser notification (if permission granted)
- [ ] Notification links directly to conversation

---

### 7.4 Message Filtering & Search

**Test Case 7.4.1: Filter Conversations**

**Steps:**
1. On messages page, filter by:
   - Unread only
   - Buyer conversations
   - Seller conversations

**Expected Results:**
- [ ] Conversations filtered correctly
- [ ] Filter state persists
- [ ] Count of results shown
- [ ] Easy to clear filter

**Test Case 7.4.2: Search Messages**

**Steps:**
1. Use search box to search for keyword "pickup"
2. View results
3. Click on result

**Expected Results:**
- [ ] Conversations containing "pickup" shown
- [ ] Search highlights keyword in results
- [ ] Clicking opens conversation
- [ ] Search is reasonably fast

---

## 8. User Profile

### 8.1 View Profile

**Test Case 8.1.1: View Own Profile**

**Steps:**
1. Click profile icon/name in header
2. Select "My Profile" or navigate to `/profile`

**Expected Results:**
- [ ] Profile page loads
- [ ] Displays:
  - Name, email, phone (if verified)
  - Account type (INDIVIDUAL/BUSINESS)
  - Member since date
  - Average rating and count
  - Verification badges
  - Account status
  - Quick stats:
    - Total listings
    - Active listings
    - Completed sales
    - Completed purchases
- [ ] Quick action buttons: Edit Profile, View Ratings, Listings

**Test Case 8.1.2: View Other User's Public Profile**

**Steps:**
1. From a listing, click on seller's name
2. View seller's public profile

**Expected Results:**
- [ ] Public profile information shown
- [ ] Private info (email, phone) hidden
- [ ] Ratings visible
- [ ] Active listings from this seller shown
- [ ] Badge and trust indicators displayed
- [ ] "Contact Seller" button available

---

### 8.2 Edit Profile

**Test Case 8.2.1: Update Profile Information**

**Steps:**
1. Navigate to `/profile/edit`
2. Change:
   - Name to "John Smith"
   - Phone to "+1-416-555-1234"
   - Account type to BUSINESS
   - Business name to "Smith Farms"
   - Language preference to French (fr)
3. Save changes

**Expected Results:**
- [ ] All changes saved successfully
- [ ] Name updated across app
- [ ] Phone number validation works
- [ ] Business fields appear when BUSINESS selected
- [ ] Language preference applied (UI may switch)
- [ ] Success notification shown

**Test Case 8.2.2: Profile Validation**

**Steps:**
1. Try saving with:
   - Empty name
   - Invalid phone format
   - Business type without business name

**Expected Results:**
- [ ] Validation errors shown
- [ ] Cannot save until valid
- [ ] Error messages helpful

**Test Case 8.2.3: Change Email/Password**

**Steps:**
1. Navigate to `/profile/settings`
2. Update email to new address
3. Change password
4. Verify changes

**Expected Results:**
- [ ] Email change requires verification
- [ ] Verification email sent to new address
- [ ] Email not changed until verified
- [ ] Password change requires current password
- [ ] Success message on password change
- [ ] Must re-login after password change

---

### 8.3 Profile Statistics

**Test Case 8.3.1: View Detailed Stats**

**Steps:**
1. On profile page, view statistics section
2. Click "View Details" or expand stats

**Expected Results:**
- [ ] Total listings created
- [ ] Active listings count
- [ ] Completed sales (as seller)
- [ ] Completed purchases (as buyer)
- [ ] Total revenue (if seller)
- [ ] Average response time to messages
- [ ] Account creation date
- [ ] Last active timestamp

---

## 9. Seller Analytics Dashboard

### 9.1 Overview Metrics

**Test Case 9.1.1: View Seller Dashboard**

**Steps:**
1. Sign in as seller with transaction history
2. Navigate to `/seller/analytics`
3. Select time range: "Last 30 days"

**Expected Results:**
- [ ] Dashboard loads with overview metrics:
  - Total revenue (CAD)
  - Active listings / Total listings
  - Completion rate %
  - Average rating
- [ ] Secondary metrics:
  - Total reservations
  - Total deposits collected
  - No-show rate %
- [ ] All metrics calculated for selected time range
- [ ] Visual indicators (arrows for trends)

**Test Case 9.1.2: Change Time Range**

**Steps:**
1. Switch between time ranges:
   - Last 7 days
   - Last 30 days
   - Last 90 days
   - Last year
   - All time
2. Observe metric changes

**Expected Results:**
- [ ] Metrics update for each time range
- [ ] Charts re-render with correct data
- [ ] Date range displayed clearly
- [ ] Smooth transitions between ranges

---

### 9.2 Revenue Trends

**Test Case 9.2.1: Revenue Chart**

**Steps:**
1. View "Revenue Trends" section
2. Hover over chart bars
3. Zoom in on specific dates if available

**Expected Results:**
- [ ] Daily revenue displayed as bar chart (last 30 days default)
- [ ] Hover shows exact amount and date
- [ ] Tooltip with details
- [ ] Y-axis shows dollar amounts
- [ ] X-axis shows dates
- [ ] Visual clarity and readability

---

### 9.3 Top Performing Listings

**Test Case 9.3.1: View Top Listings**

**Steps:**
1. Scroll to "Top Performing Listings" section
2. Review top 10 listings by revenue

**Expected Results:**
- [ ] Listings ranked by revenue
- [ ] Shows: listing title, total revenue, reservation count, status
- [ ] Click to view listing details
- [ ] Visual ranking (1st, 2nd, 3rd highlighted)
- [ ] Accurate calculations

---

### 9.4 Category Performance

**Test Case 9.4.1: Category Breakdown**

**Steps:**
1. View "Performance by Category" section
2. Analyze data

**Expected Results:**
- [ ] Revenue per category shown
- [ ] Number of listings per category
- [ ] Number of reservations per category
- [ ] Average revenue per listing calculated
- [ ] Visual chart (pie/bar) for easy comparison
- [ ] Categories with zero activity may be hidden or shown as $0

---

### 9.5 Buyer Insights

**Test Case 9.5.1: Buyer Analytics**

**Steps:**
1. Navigate to "Buyer Insights" section
2. Review customer data

**Expected Results:**
- [ ] Total unique buyers count
- [ ] Repeat buyer count
- [ ] Repeat buyer rate % calculated
- [ ] Top buyers list shows:
  - Buyer email/name
  - Number of orders
  - Total amount spent
  - Last order date
- [ ] Sortable by different columns
- [ ] Privacy-compliant display

---

### 9.6 Time-Based Insights

**Test Case 9.6.1: Performance by Time**

**Steps:**
1. View "Time-Based Insights"
2. Analyze patterns

**Expected Results:**
- [ ] Performance by day of week shown
- [ ] Peak activity hours displayed
- [ ] Reservation volume by time period
- [ ] Heatmap or chart visualization
- [ ] Insights help optimize listing times

---

## 10. Admin & Moderation

### 10.1 Listing Moderation

**Test Case 10.1.1: View Pending Listings**

**Steps:**
1. Sign in as admin
2. Navigate to `/admin/moderation`
3. View pending listings queue

**Expected Results:**
- [ ] All `PENDING_REVIEW` listings shown
- [ ] Sorted by submission date
- [ ] Shows: title, seller, category, price, submission time
- [ ] Quick preview available
- [ ] AI moderation scores visible (if implemented)

**Test Case 10.1.2: Approve Listing**

**Steps:**
1. Click on pending listing to review
2. Examine details, images, description
3. Click "Approve"
4. Add optional note

**Expected Results:**
- [ ] Listing status → `PUBLISHED`
- [ ] Becomes visible in search results
- [ ] Seller notified of approval
- [ ] Admin note saved
- [ ] Timestamp recorded

**Test Case 10.1.3: Reject Listing**

**Steps:**
1. Review listing with inappropriate content
2. Click "Reject"
3. Select reason: "Prohibited item"
4. Add detailed note: "Electronics resale not permitted without business license"
5. Confirm rejection

**Expected Results:**
- [ ] Listing status → `REJECTED`
- [ ] Not visible to public
- [ ] Seller notified with reason
- [ ] Rejection reason and note saved
- [ ] Seller can edit and resubmit

---

### 10.2 User Moderation

**Test Case 10.2.1: Suspend User Account**

**Steps:**
1. Navigate to `/admin/trust-safety`
2. Search for user by email
3. Click "Suspend Account"
4. Enter reason: "Multiple buyer complaints"
5. Set duration: 7 days
6. Confirm

**Expected Results:**
- [ ] Account status → `SUSPENDED`
- [ ] User cannot create listings or reservations
- [ ] Existing reservations may be honored or cancelled
- [ ] User sees suspension notice on login
- [ ] Suspension expiry date set
- [ ] Automatic reactivation after 7 days

**Test Case 10.2.2: Ban User Permanently**

**Steps:**
1. Identify user with fraudulent activity
2. Click "Ban Account"
3. Select reason: "Fraud"
4. Add detailed internal note
5. Confirm ban

**Expected Results:**
- [ ] Account status → `BANNED`
- [ ] User cannot log in
- [ ] All active listings removed/hidden
- [ ] All active reservations cancelled with refunds
- [ ] User sees ban message
- [ ] Cannot create new account with same email

**Test Case 10.2.3: Reactivate Account**

**Steps:**
1. User appeals suspension
2. Admin reviews case
3. Click "Reactivate Account"
4. Add reinstatement note

**Expected Results:**
- [ ] Account status → `ACTIVE`
- [ ] User can resume normal activity
- [ ] Notification sent to user
- [ ] Moderation history preserved

---

### 10.3 Moderation Notes & History

**Test Case 10.3.1: Add Moderation Note**

**Steps:**
1. View user or listing in admin panel
2. Add note: "User contacted support about policy question - resolved"
3. Save note

**Expected Results:**
- [ ] Note saved with timestamp
- [ ] Admin user recorded as author
- [ ] Note visible to other admins
- [ ] History of all notes viewable

**Test Case 10.3.2: View Moderation History**

**Steps:**
1. View user profile in admin panel
2. Click "Moderation History"
3. Review all actions

**Expected Results:**
- [ ] All admin actions listed chronologically
- [ ] Shows: action type, admin user, timestamp, notes
- [ ] Includes: approvals, rejections, suspensions, notes
- [ ] Audit trail complete and immutable

---

## 11. Cross-Feature Integration Tests

### 11.1 Complete End-to-End Flow

**Test Case 11.1.1: Full Transaction Lifecycle**

**Steps:**
1. **Seller**: Sign up, verify email
2. **Seller**: Create listing with images, submit for review
3. **Admin**: Approve listing
4. **Buyer**: Sign up, search for listing by location
5. **Buyer**: View listing details, message seller
6. **Seller**: Respond to message
7. **Buyer**: Create reservation
8. **Buyer**: Pay 5% deposit via Stripe
9. **Seller**: Receive notification, prepare items
10. **Buyer**: Pickup items, show QR code
11. **Seller**: Verify code, mark as completed
12. **Buyer**: Rate seller (4 stars)
13. **Seller**: Rate buyer (5 stars)
14. **Both**: View mutual ratings

**Expected Results:**
- [ ] Each step completes successfully
- [ ] Data flows correctly between all modules
- [ ] All notifications sent at right times
- [ ] Inventory managed correctly
- [ ] Payments processed and recorded
- [ ] Ratings become visible after both submitted
- [ ] No errors or data inconsistencies

---

### 11.2 Multi-User Scenarios

**Test Case 11.2.1: Multiple Buyers for Same Listing**

**Steps:**
1. Seller creates listing with quantity: 20
2. Buyer 1 reserves 10 units
3. Buyer 2 reserves 8 units
4. Buyer 3 tries to reserve 5 units

**Expected Results:**
- [ ] Buyer 1 reservation successful (10 reserved, 10 available)
- [ ] Buyer 2 reservation successful (18 reserved, 2 available)
- [ ] Buyer 3 gets error: "Only 2 available"
- [ ] Inventory accurately tracked
- [ ] No overselling

**Test Case 11.2.2: Concurrent Messaging**

**Steps:**
1. Buyer 1 and Buyer 2 message same seller simultaneously
2. Seller responds to both
3. Check conversation threads

**Expected Results:**
- [ ] Two separate conversations created
- [ ] Messages don't cross-contaminate
- [ ] Seller sees both conversations in inbox
- [ ] Each buyer sees only their own thread

---

### 11.3 Payment & Refund Workflow

**Test Case 11.3.1: Refund After Cancellation**

**Steps:**
1. Buyer makes reservation and pays deposit ($5)
2. Buyer cancels within 24 hours
3. Refund processed
4. Check Stripe dashboard and buyer's bank

**Expected Results:**
- [ ] Refund initiated automatically or by admin
- [ ] Stripe refund appears in dashboard
- [ ] Buyer notified of refund
- [ ] Amount returned to buyer's card (2-10 business days)
- [ ] Reservation status reflects cancellation

---

## 12. Edge Cases & Error Handling

### 12.1 Network & System Errors

**Test Case 12.1.1: Offline Behavior**

**Steps:**
1. Disconnect internet while on search page
2. Try to search or navigate
3. Reconnect internet

**Expected Results:**
- [ ] Error message: "Network error. Please check your connection."
- [ ] No crashes or white screens
- [ ] Graceful degradation
- [ ] Auto-retry when connection restored

**Test Case 12.1.2: API Timeout**

**Steps:**
1. Simulate slow API response
2. Observe loading states and timeouts

**Expected Results:**
- [ ] Loading indicators shown
- [ ] Timeout after reasonable duration (30s)
- [ ] Error message if timeout occurs
- [ ] Option to retry

---

### 12.2 Data Edge Cases

**Test Case 12.2.1: Special Characters in Input**

**Steps:**
1. Create listing with title: `<script>alert("XSS")</script>`
2. Try description with SQL injection: `'; DROP TABLE listings; --`
3. Try emoji in business name: `🍎 Fresh Apples Inc. 🍏`

**Expected Results:**
- [ ] Special characters properly escaped
- [ ] No XSS vulnerabilities
- [ ] No SQL injection possible
- [ ] Emojis display correctly or are sanitized

**Test Case 12.2.2: Extreme Values**

**Steps:**
1. Set price to $0.01
2. Set price to $99,999.99
3. Set quantity to 1
4. Set quantity to 10,000

**Expected Results:**
- [ ] Minimum price enforced (e.g., $1)
- [ ] Maximum price handled gracefully
- [ ] Low quantities work correctly
- [ ] High quantities don't break UI or calculations

**Test Case 12.2.3: Missing or Corrupted Data**

**Steps:**
1. Directly manipulate database to remove required field
2. View listing/profile with missing data
3. Check error handling

**Expected Results:**
- [ ] App doesn't crash
- [ ] Default values or placeholders shown
- [ ] Logs error for admin review
- [ ] User sees graceful degradation

---

### 12.3 Browser Compatibility

**Test Case 12.3.1: Cross-Browser Testing**

**Steps:**
1. Test entire flow on:
   - Chrome (latest)
   - Firefox (latest)
   - Safari (latest)
   - Edge (latest)

**Expected Results:**
- [ ] All features work on all browsers
- [ ] UI renders correctly
- [ ] No console errors
- [ ] Payment processing works
- [ ] Image uploads work

**Test Case 12.3.2: Older Browser Support**

**Steps:**
1. Test on older browser versions (e.g., Chrome 2 versions back)
2. Check for graceful degradation

**Expected Results:**
- [ ] Core functionality works
- [ ] Polyfills loaded if needed
- [ ] Message shown if browser too old
- [ ] No complete failures

---

## 13. Performance & UX

### 13.1 Page Load Performance

**Test Case 13.1.1: Initial Page Load**

**Steps:**
1. Clear cache and reload homepage
2. Measure load time with DevTools
3. Check Core Web Vitals

**Expected Results:**
- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Time to Interactive < 3.5s
- [ ] No layout shifts (CLS < 0.1)
- [ ] Acceptable performance score (Lighthouse > 80)

**Test Case 13.1.2: Search Results Performance**

**Steps:**
1. Perform search with 100+ results
2. Scroll through results
3. Switch to map view

**Expected Results:**
- [ ] Results load within 2 seconds
- [ ] Smooth scrolling (60fps)
- [ ] Images lazy-load
- [ ] Map renders without lag
- [ ] Pagination or infinite scroll works smoothly

---

### 13.2 User Experience

**Test Case 13.2.1: Form Usability**

**Steps:**
1. Fill out listing creation form
2. Make intentional errors
3. Submit and observe

**Expected Results:**
- [ ] Inline validation on blur
- [ ] Clear error messages
- [ ] Focus moves to first error
- [ ] Progress saved (localStorage or draft)
- [ ] Helpful placeholder text
- [ ] Character counters for limited fields

**Test Case 13.2.2: Mobile UX**

**Steps:**
1. Complete key flows on mobile device
2. Test touch interactions
3. Verify responsive design

**Expected Results:**
- [ ] All buttons/links easily tappable (min 44x44px)
- [ ] Text readable without zooming
- [ ] Forms usable with mobile keyboard
- [ ] Images don't overflow
- [ ] Navigation accessible

---

### 13.3 Accessibility

**Test Case 13.3.1: Keyboard Navigation**

**Steps:**
1. Navigate site using only Tab and Enter keys
2. Try to complete a reservation

**Expected Results:**
- [ ] All interactive elements focusable
- [ ] Focus indicators visible
- [ ] Logical tab order
- [ ] Can complete all actions via keyboard
- [ ] Skip links available

**Test Case 13.3.2: Screen Reader Compatibility**

**Steps:**
1. Use screen reader (NVDA, JAWS, or VoiceOver)
2. Navigate through key pages

**Expected Results:**
- [ ] Semantic HTML used
- [ ] ARIA labels present where needed
- [ ] Images have alt text
- [ ] Form labels properly associated
- [ ] Dynamic content changes announced

**Test Case 13.3.3: Color Contrast**

**Steps:**
1. Use browser extension to check contrast ratios
2. Review text, buttons, links

**Expected Results:**
- [ ] Text contrast ratio ≥ 4.5:1
- [ ] Large text ≥ 3:1
- [ ] Interactive elements clearly visible
- [ ] WCAG AA compliance minimum

---

## 14. Mobile Responsiveness

### 14.1 Responsive Breakpoints

**Test Case 14.1.1: Mobile (320px - 767px)**

**Steps:**
1. Resize browser to 375px width
2. Navigate through all key pages

**Expected Results:**
- [ ] Single column layout
- [ ] Hamburger menu for navigation
- [ ] Images scale correctly
- [ ] Buttons full-width or stacked
- [ ] No horizontal scrolling
- [ ] Text readable (min 16px)

**Test Case 14.1.2: Tablet (768px - 1023px)**

**Steps:**
1. Resize to 768px width
2. Test landscape and portrait

**Expected Results:**
- [ ] Optimized layout for tablet
- [ ] Grid layouts (2 columns)
- [ ] Navigation accessible
- [ ] Forms properly sized
- [ ] Map view usable

**Test Case 14.1.3: Desktop (1024px+)**

**Steps:**
1. View on 1920px width display
2. Test all layouts

**Expected Results:**
- [ ] Maximum content width enforced
- [ ] Multi-column layouts
- [ ] Expanded navigation
- [ ] Optimal use of screen real estate
- [ ] No excessive whitespace

---

### 14.2 Touch Interactions

**Test Case 14.2.1: Swipe Gestures**

**Steps:**
1. On mobile, swipe through image galleries
2. Try pull-to-refresh
3. Test any carousels

**Expected Results:**
- [ ] Smooth swipe animations
- [ ] Gestures feel natural
- [ ] No accidental activations
- [ ] Visual feedback on touch

**Test Case 14.2.2: Pinch to Zoom**

**Steps:**
1. Try pinching on listing images
2. Test map zoom gestures

**Expected Results:**
- [ ] Images zoom smoothly
- [ ] Map pinch-zoom works
- [ ] Viewport meta tag prevents unwanted zoom on form inputs

---

## 15. Security Testing

### 15.1 Authentication Security

**Test Case 15.1.1: Password Requirements**

**Steps:**
1. Try creating account with weak passwords:
   - "123"
   - "password"
   - "abc"

**Expected Results:**
- [ ] Minimum 8 characters enforced
- [ ] Complexity requirements shown
- [ ] Weak passwords rejected
- [ ] Strength indicator present

**Test Case 15.1.2: Session Security**

**Steps:**
1. Log in and note session cookie
2. Try modifying session cookie
3. Try using expired session

**Expected Results:**
- [ ] HttpOnly and Secure flags set on cookies
- [ ] Modified cookies invalidated
- [ ] Expired sessions force re-login
- [ ] CSRF protection in place

---

### 15.2 Authorization Security

**Test Case 15.2.1: Access Control**

**Steps:**
1. As Buyer, try to access `/admin/moderation` directly via URL
2. Try to edit another user's listing
3. Try to view another user's reservations

**Expected Results:**
- [ ] 403 Forbidden or redirect to login
- [ ] Cannot access unauthorized resources
- [ ] Server-side validation enforced
- [ ] No data leakage in error messages

---

### 15.3 Input Validation

**Test Case 15.3.1: XSS Prevention**

**Steps:**
1. Try injecting scripts in:
   - Listing title
   - Description
   - Messages
   - Profile name

**Expected Results:**
- [ ] All user input sanitized
- [ ] Scripts don't execute
- [ ] HTML entities escaped
- [ ] No reflected XSS vulnerabilities

**Test Case 15.3.2: SQL Injection Prevention**

**Steps:**
1. Try SQL injection in search fields
2. Try in login form

**Expected Results:**
- [ ] Parameterized queries used
- [ ] No SQL errors exposed
- [ ] Injection attempts fail safely

---

## Test Sign-Off

### Test Completion Checklist

- [ ] All critical path tests passed
- [ ] All high-priority bugs resolved
- [ ] Cross-browser testing complete
- [ ] Mobile responsiveness verified
- [ ] Performance benchmarks met
- [ ] Security tests passed
- [ ] Accessibility standards met
- [ ] Admin/moderation features tested
- [ ] Payment integration verified in test mode
- [ ] Email/SMS notifications tested

### Known Issues Log

| Issue ID | Description | Severity | Status | Notes |
|----------|-------------|----------|--------|-------|
| | | | | |

### Test Environment Details

**Tested On:**
- Date: _______________
- Environment: Local / Staging / Production
- Database Version: _______________
- Browser Versions: _______________
- Mobile Devices: _______________

**Tester Information:**
- Name: _______________
- Role: _______________
- Sign-off Date: _______________

---

## Appendix

### Test Data Sets

**Stripe Test Cards:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Insufficient Funds: `4000 0000 0000 9995`
- Authentication Required: `4000 0025 0000 3155`

**Test Postal Codes (Canada):**
- Toronto: M5V 3A8
- Montreal: H2Y 1C6
- Vancouver: V6B 1A1

**Test Addresses:**
- 123 Main Street, Toronto, ON M5V 3A8
- 456 Rue Saint-Paul, Montreal, QC H2Y 1C6
- 789 Robson Street, Vancouver, BC V6B 1A1

### Common Issues & Troubleshooting

**Issue:** Images not uploading
- Check file size limits
- Verify supported formats
- Check network connection

**Issue:** Payment failing
- Ensure test mode enabled
- Check Stripe API keys
- Verify card details format

**Issue:** Search returning no results
- Check geocoding service
- Verify database has listings
- Check search radius

---

**End of Manual Test Plan**
