-- Add pipes back to Ice Cream flavors for column display
UPDATE menu_categories 
SET description = 'Current Flavors:
Award Winning Chocolate | Vanilla | Butter Pecan | Moose Tracks | Black Cherry | Coconut | Blueberry Cheesecake | Banana Pudding | Rum Raisin | Graham Central Station | Brown Butter Bourbon Truffle | Key Lime Pie | Coffee | Whitehouse Cherry | Peanut Butter Twist | Green Mint Chip | Road Runner Raspberry | Rainbow Sorbet | Strawberry Cheesecake | Orange Blossom | Superman | SUGAR FREE Vanilla | SUGAR FREE Turtle Sundae'
WHERE id = 7;
