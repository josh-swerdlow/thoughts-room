Make the settings more intuitive.

1. Timing -> How long do your thoughts stay
2. Travel > How far do your thoughts travel
3. Velocity -> How fast do your thoughts travel
4. Scale > How do your thoughts distort as they travel

Make a json config file that has each of the sections and 'prompt' describing the section, each variable within that section, a prompt describing them, the default value, the min/max configurable value, and the min/max absolute value (used as a hard cutoff regardless of random animation logic). Remove the filter and blur options from display. Also each setting should have a 'public' field which selects whether it appears in the 'settings' menu.

For some of these values, the slider let's us choose completely irresponsbile values. Remove the 'random' variables from the displayed configuration -- only use it internally.

timing
base duration 4200s -> should never be more than a 5 seconds. So make this a slider between 0 and 5.

random duration
2600s

max delay
360s

travel
vertical base (px) - 110 -> Should never be taller than the screen. So fetch the screen size and make that the max of the slider.
vertical random (px) - 220
horizontal ratio
0.28
horizontal min (px)
160
velocity & scale
velocity min
0.85
velocity max
1.4
scale min
0.92
scale max
1.12
rotation max (deg)
10

cleanup
removal buffer
1200s

fallback lifetime
6500s


Make the value of the animation change with some amount of variety.