const argv = require('yargs').argv;
const autoprefixer = require('gulp-autoprefixer');
const browserSync = require('browser-sync').create();
const csso = require('gulp-csso');
const del = require('del');
const gcmq = require('gulp-group-css-media-queries');
const gulp = require('gulp');
const htmlmin = require('gulp-htmlmin');
const nunjucks = require('gulp-nunjucks');
const progectConfig = require('./projectConfig.json');
const rename = require("gulp-rename");
const sass = require('gulp-sass')(require('sass'));
const sourcemaps = require('gulp-sourcemaps');
const squoosh = require('gulp-libsquoosh');
const svgo = require('gulp-svgmin');
const svgstore = require('gulp-svgstore');

const path = progectConfig.path;
const isDev = !argv.prod;


path.source.html[0] = path.source.srcPath + path.source.html[0];
path.source.html[1] = "!" + path.source.html[0].slice(0, -6) + "_*.html";
path.source.html[2] = "!" + path.source.srcPath + "/assets";
path.source.html[3] = "!" + path.source.srcPath + "/_html";
path.build.html = path.build.buildPath + path.build.html;

path.source.style[0] = path.source.srcPath + path.source.style[0];
path.build.style = path.build.buildPath + path.build.style;

path.source.js[0] = path.source.srcPath + path.source.js[0];
path.build.js = path.build.buildPath + path.build.js;

path.source.fonts[0] = path.source.srcPath + path.source.fonts[0];
path.build.fonts = path.build.buildPath + path.build.fonts;

path.source.img[0] = path.source.srcPath + path.source.img[0];
path.build.img = path.build.buildPath + path.build.img;

path.source.svg[0] = path.source.srcPath + path.source.svg[0];
path.source.sprite[0] = path.source.srcPath + path.source.sprite[0];
path.build.svg = path.build.buildPath + path.build.svg;

path.watch = {};
path.watch.js = [];
path.watch.js[0] = path.source.js[0];

path.watch.html = [];
path.watch.html[0] = path.source.html[0];

path.watch.style = [];
path.watch.style[0] = path.source.style[0].replace(path.source.style[0].split('/').pop(), '**/*.scss');


const cleanBuild = () => del(path.build.buildPath);

const startSync = () =>
  browserSync.init({
    open: true,
    server: path.build.buildPath
  });

const copyFonts = () =>
  gulp.src(path.source.fonts)
    .pipe(gulp.dest(path.build.fonts));

const copyScripts = () =>
  gulp.src(path.source.js)
    .pipe(gulp.dest(path.build.js))
    .on('end', browserSync.reload);

const constructHTML = () =>
  gulp.src(path.source.html)
    .pipe(nunjucks.compile())
    .pipe(htmlmin({collapseWhitespace: true}))
    .pipe(gulp.dest(path.build.html))
    .on('end', browserSync.reload);

const constructCSS = () => {
  if (isDev)
    return gulp.src(path.source.style)
      .pipe(sourcemaps.init())
      .pipe(sass())
      .pipe(sourcemaps.write())
      .pipe(rename({suffix: '.min'}))
      .pipe(gulp.dest(path.build.style))
      .pipe(browserSync.reload({stream: true}));

  return gulp.src(path.source.style)
    .pipe(sass())
    .pipe(autoprefixer({grid: true}))
    .pipe(gcmq())
    .pipe(gulp.dest(path.build.style))
    .pipe(csso())
    .pipe(rename({suffix: '.min'}))
    .pipe(gulp.dest(path.build.style))
    .pipe(browserSync.reload({stream: true}));
}

const optimizeImages = (done) => {
  if (isDev) {
    gulp.src(path.source.img)
      .pipe(gulp.dest(path.build.img));

    gulp.src(path.source.img)
      .pipe(squoosh({webp: {}}))
      .pipe(gulp.dest(path.build.img));

    done();
  } else {
    gulp.src(path.source.img)
      .pipe(gulp.dest(path.build.img));

    gulp.src(path.source.img)
      .pipe(squoosh({webp: {}}))
      .pipe(gulp.dest(path.build.img));

    gulp.src(path.source.img)
      .pipe(squoosh((src) => ({
        preprocessOptions: { resize: {
            width: Math.round(src.width * 2),
            height: Math.round(src.height * 2),
        }}
      })))
      .pipe(rename({suffix: '@2x'}))
      .pipe(gulp.dest(path.build.img));

    gulp.src(path.source.img)
      .pipe(squoosh((src) => ({
        encodeOptions: {webp: {}},
        preprocessOptions: { resize: {
            width: Math.round(src.width * 2),
            height: Math.round(src.height * 2),
        }}
      })))
      .pipe(rename({suffix: '@2x'}))
      .pipe(gulp.dest(path.build.img));

    done();
  }
}

const optimizeSvg = () => {
  if (isDev)
    return gulp.src(path.source.svg)
      .pipe(gulp.dest(path.build.svg));

  return gulp.src(path.source.svg)
    .pipe(svgo())
    .pipe(gulp.dest(path.build.svg));
}

const createSprite = () => {
  if (isDev)
    return gulp.src(path.source.sprite)
      .pipe(svgstore({inlineSvg: true}))
      .pipe(rename('sprite.svg'))
      .pipe(gulp.dest(path.build.svg));

  return gulp.src(path.source.sprite)
    .pipe(svgo())
    .pipe(svgstore({inlineSvg: true}))
    .pipe(rename('sprite.svg'))
    .pipe(gulp.dest(path.build.svg));
}

const watch = () => {
  gulp.watch(path.watch.js, copyScripts);
  gulp.watch(path.watch.html, constructHTML);
  gulp.watch(path.watch.style, constructCSS);
}


exports.default = gulp.series(
  cleanBuild,
  gulp.parallel(copyFonts, copyScripts, constructHTML, constructCSS),
  gulp.parallel(optimizeImages, optimizeSvg, createSprite),
  gulp.parallel(startSync, watch)
);
