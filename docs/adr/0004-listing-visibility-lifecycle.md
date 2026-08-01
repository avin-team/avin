# Listing visibility lifecycle

Listings use distinct `PAUSED` and `HIDDEN` states: a Seller pauses their own Listing, while an Admin hides it through post-moderation. `ARCHIVED` is terminal; a Seller may resume only a paused Listing, and an Admin may restore only a hidden Listing. This separates voluntary availability from platform enforcement and makes each actor's authority explicit.
