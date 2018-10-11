find -L . -type f -name "*.pug" -print0 | while IFS= read -r -d '' FNAME; do
    mv -- "$FNAME" "${FNAME%.pug}.jade"
done
