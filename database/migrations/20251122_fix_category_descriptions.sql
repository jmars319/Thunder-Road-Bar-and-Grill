-- Fix category descriptions to remove pipes and format properly

UPDATE menu_categories 
SET description = 'Served plain or tossed in your choice of sauce:
Mild, Medium, Hot, Extra Hot, BBQ, Garlic Parmesan, Kickin'' Bourbon, Sweet Teriyaki, Hot Honey

↓ Make it a Combo - Side + Drink for $4.50 ↓'
WHERE id = 2;

UPDATE menu_categories 
SET description = 'Toppings:
Pepperoni, Sausage, Bacon, Ham, Red Onion, Green Pepper, Tomato, Jalapeno

↓ Make it a Combo - Side + Drink for $4.50 ↓'
WHERE id = 4;

UPDATE menu_categories 
SET description = 'Current Flavors:
Award Winning Chocolate, Vanilla, Butter Pecan, Moose Tracks, Black Cherry, Coconut, Blueberry Cheesecake, Banana Pudding, Rum Raisin, Graham Central Station, Brown Butter Bourbon Truffle, Key Lime Pie, Coffee, Whitehouse Cherry, Peanut Butter Twist, Green Mint Chip, Road Runner Raspberry, Rainbow Sorbet, Strawberry Cheesecake, Orange Blossom, Superman, SUGAR FREE Vanilla, SUGAR FREE Turtle Sundae'
WHERE id = 7;
