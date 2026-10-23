from django.urls import path

from .views import GenerateDescriptionView, NaturalLanguageSearchView, SuggestTagsView

urlpatterns = [
    path("generate-description/", GenerateDescriptionView.as_view(), name="ai-description"),
    path("suggest-tags/", SuggestTagsView.as_view(), name="ai-tags"),
    path("search/", NaturalLanguageSearchView.as_view(), name="ai-search"),
]
