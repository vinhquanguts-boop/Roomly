# Roomly Analytics

Analytics are disabled unless a visitor accepts optional analytics and `VITE_POSTHOG_API_KEY` is configured. Never attach photos, room-analysis text, chat content, email addresses, or names to events.

| Event | When |
| --- | --- |
| `landing_view` | The landing route renders |
| `upload_start` | A valid room photo is selected |
| `upload_complete` | The resized image upload finishes |
| `analysis_complete` | Room analysis is returned |
| `plan_generated` | A design reaches a ready state |
| `render_complete` | A design has a render URL |
| `product_click` | A retailer link is opened |
| `design_saved` | A design is saved |
| `design_shared` | A design is published |
| `chat_message_sent` | A refinement message is submitted |
