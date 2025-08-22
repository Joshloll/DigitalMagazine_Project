import React, { useState } from "react";
import HTMLFlipBook from "react-pageflip";
import Draggable from "react-draggable";
import { ResizableBox } from "react-resizable";
import { v4 as uuidv4 } from "uuid";
import "react-resizable/css/styles.css";

const AdminMagazineEditor = () => {
  const [pages, setPages] = useState([
    { id: uuidv4(), elements: [] }
  ]);
  const [selectedPage, setSelectedPage] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState(null);

  // Add a text element
  const addText = () => {
    const updatedPages = [...pages];
    updatedPages[selectedPage].elements.push({
      id: uuidv4(),
      type: "text",
      content: "New Text",
      style: { fontSize: 16, color: "#000", width: 150, height: 50 },
      position: { x: 20, y: 20 }
    });
    setPages(updatedPages);
  };

  // Add an image element
  const addImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);

    const updatedPages = [...pages];
    updatedPages[selectedPage].elements.push({
      id: uuidv4(),
      type: "image",
      content: url,
      style: { width: 200, height: 150 },
      position: { x: 20, y: 20 }
    });
    setPages(updatedPages);
  };

  // Add a new page
  const addPage = () => {
    setPages([...pages, { id: uuidv4(), elements: [] }]);
    setSelectedPage(pages.length);
  };

  // Update element content
  const updateElementContent = (id, content) => {
    const updatedPages = [...pages];
    const el = updatedPages[selectedPage].elements.find(el => el.id === id);
    if (el) el.content = content;
    setPages(updatedPages);
  };

  // Update element style
  const updateElementStyle = (id, newStyle) => {
    const updatedPages = [...pages];
    const el = updatedPages[selectedPage].elements.find(el => el.id === id);
    if (el) el.style = { ...el.style, ...newStyle };
    setPages(updatedPages);
  };

  // Update element position
  const updateElementPosition = (id, x, y) => {
    const updatedPages = [...pages];
    const el = updatedPages[selectedPage].elements.find(el => el.id === id);
    if (el) el.position = { x, y };
    setPages(updatedPages);
  };

  const selectedElement = pages[selectedPage]?.elements.find(el => el.id === selectedElementId);

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#000" }}>
      {/* Left Toolbar */}
      <div style={{ width: "150px", backgroundColor: "#111", color: "#fff", padding: "10px" }}>
        <h3>Tools</h3>
        <button onClick={addText}>Add Text</button>
        <br />
        <label style={{ cursor: "pointer" }}>
          Add Image
          <input type="file" style={{ display: "none" }} onChange={addImage} />
        </label>
        <br />
        <button onClick={addPage}>Add Page</button>
      </div>

      {/* Flipbook */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <HTMLFlipBook width={400} height={600} onFlip={(e) => setSelectedPage(e.data)}>
          {pages.map((page, pageIndex) => (
            <div
              key={page.id}
              style={{ backgroundColor: "#fff", position: "relative", padding: "10px" }}
            >
              {page.elements.map(el => (
                <Draggable
                  key={el.id}
                  position={el.position}
                  onStop={(e, data) => updateElementPosition(el.id, data.x, data.y)}
                >
                  <ResizableBox
                    width={el.style.width}
                    height={el.style.height}
                    minConstraints={[50, 20]}
                    onResizeStop={(e, { size }) =>
                      updateElementStyle(el.id, { width: size.width, height: size.height })
                    }
                  >
                    {el.type === "text" ? (
                      <textarea
                        value={el.content}
                        onClick={() => setSelectedElementId(el.id)}
                        onChange={(e) => updateElementContent(el.id, e.target.value)}
                        style={{
                          width: "100%",
                          height: "100%",
                          fontSize: el.style.fontSize,
                          color: el.style.color,
                          resize: "none",
                          border: selectedElementId === el.id ? "2px solid blue" : "1px solid #ccc"
                        }}
                      />
                    ) : (
                      <img
                        src={el.content}
                        alt=""
                        onClick={() => setSelectedElementId(el.id)}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          border: selectedElementId === el.id ? "2px solid blue" : "none"
                        }}
                      />
                    )}
                  </ResizableBox>
                </Draggable>
              ))}
            </div>
          ))}
        </HTMLFlipBook>
      </div>

      {/* Right Toolbar */}
      <div style={{ width: "180px", backgroundColor: "#111", color: "#fff", padding: "10px" }}>
        <h3>Properties</h3>
        {selectedElement ? (
          <div>
            {selectedElement.type === "text" && (
              <>
                <label>Font Size</label>
                <input
                  type="number"
                  value={selectedElement.style.fontSize}
                  onChange={(e) =>
                    updateElementStyle(selectedElement.id, { fontSize: parseInt(e.target.value) })
                  }
                />
                <br />
                <label>Color</label>
                <input
                  type="color"
                  value={selectedElement.style.color}
                  onChange={(e) => updateElementStyle(selectedElement.id, { color: e.target.value })}
                />
              </>
            )}
            {selectedElement.type === "image" && (
              <>
                <label>Width</label>
                <input
                  type="number"
                  value={selectedElement.style.width}
                  onChange={(e) =>
                    updateElementStyle(selectedElement.id, { width: parseInt(e.target.value) })
                  }
                />
                <br />
                <label>Height</label>
                <input
                  type="number"
                  value={selectedElement.style.height}
                  onChange={(e) =>
                    updateElementStyle(selectedElement.id, { height: parseInt(e.target.value) })
                  }
                />
              </>
            )}
          </div>
        ) : (
          <p>Select an element to edit</p>
        )}
      </div>
    </div>
  );
};

export default AdminMagazineEditor;
