import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/temp"); 
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);

        // console.log("file", file);
        // console.log(path.dirname(file.originalname));
        // console.log(1e9);
        // const uniqueName = `${Date.now()}-${Math.round(
        //     Math.random() * 1e9
        // )}${path.extname(file.originalname)}`;
        // cb(null, uniqueName);
    },
});

const upload = multer({ storage: storage });

export { upload };
