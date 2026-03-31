import app from "./backend/app.js";

const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(`MFU voting app listening on http://localhost:${port}`);
});
