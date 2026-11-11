ALTER TABLE profile_classes ADD COLUMN creation_request TEXT;
CREATE UNIQUE INDEX profile_class_creation_request ON profile_classes(owner,creation_request)
  WHERE creation_request IS NOT NULL;
