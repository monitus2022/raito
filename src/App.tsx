import { Route, Routes } from "react-router-dom";
import { Home } from "./routes/Home";
import { Placeholder } from "./routes/Placeholder";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/lesson/:id"
        element={
          <Placeholder
            title="課程"
            description="課程渲染器會在第四階段加入。"
          />
        }
      />
      <Route
        path="/review"
        element={
          <Placeholder
            title="複習"
            description="複習佇列會在第五階段加入。"
          />
        }
      />
      <Route
        path="/progress"
        element={
          <Placeholder
            title="進度"
            description="進度檢視會在第五與第七階段加入。"
          />
        }
      />
      <Route
        path="/settings"
        element={
          <Placeholder
            title="設定"
            description="設定會在第四階段後段加入。"
          />
        }
      />
      <Route
        path="/about"
        element={
          <Placeholder
            title="來源與授權"
            description="第三方來源與授權清單會隨內容一起建立。"
          />
        }
      />
      <Route
        path="*"
        element={
          <Placeholder
            title="找不到頁面"
            description="這個路徑尚未建立。"
          />
        }
      />
    </Routes>
  );
}
